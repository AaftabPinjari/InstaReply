import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Admin client for webhook processing (no user context)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Meta webhook verification challenge
export async function GET(request: NextRequest) {
    console.log("[Webhook] Received GET request");
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    console.log(`[Webhook] Verification attempt: mode=${mode}, token=${token}, challenge=${challenge}`);
    console.log(`[Webhook] Expected token: ${process.env.META_WEBHOOK_VERIFY_TOKEN}`);

    if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
        console.log("[Webhook] Verification successful");
        return new NextResponse(challenge, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
        });
    }

    console.log("[Webhook] Verification failed: Token mismatch or invalid mode");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST: Receive comment events
export async function POST(request: NextRequest) {
    const body = await request.text();

    // Validate signature
    const signature = request.headers.get("x-hub-signature-256");
    if (signature && process.env.META_APP_SECRET) {
        const expectedSignature =
            "sha256=" +
            crypto
                .createHmac("sha256", process.env.META_APP_SECRET)
                .update(body)
                .digest("hex");

        if (signature !== expectedSignature) {
            console.warn(`[Webhook] Invalid signature warning. Received: ${signature}, Expected: ${expectedSignature}. Continuing for debug purposes...`);
            // WARNING: In production, uncomment the line below to enforce security!
            // return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
    }

    const data = JSON.parse(body);
    console.log("[Webhook] Received:", JSON.stringify(data, null, 2));

    // Process comment events
    if (data.object === "instagram") {
        for (const entry of data.entry || []) {
            for (const change of entry.changes || []) {
                if (change.field === "comments") {
                    await handleComment(change.value, entry.id);
                }
            }
        }
    }

    // Always return 200 quickly to Meta
    return NextResponse.json({ received: true }, { status: 200 });
}

async function handleComment(
    commentData: {
        id: string;
        text: string;
        from: { id: string; username: string };
        media: { id: string };
    },
    igUserId: string
) {
    const { id: commentId, text, from, media } = commentData;

    console.log(
        `[Webhook] Processing comment ${commentId} from @${from.username} (ID: ${from.id}) on Media ${media.id}`
    );

    // 1. Find the Instagram account in our DB FIRST
    const { data: account } = await supabase
        .from("instagram_accounts")
        .select("id, user_id, access_token, page_id, page_access_token, ig_username")
        .eq("ig_user_id", igUserId)
        .single();

    if (!account) {
        console.log("[Webhook] No account found for IG user:", igUserId);
        return;
    }

    // 2. IGNORE BOT'S OWN COMMENTS (Crucial to prevent loops!)
    if (String(from.id) === String(igUserId) || from.username === account.ig_username) {
        console.log(`[Webhook] Ignoring comment from account owner (ID: ${from.id}, Username: ${from.username})`);
        return;
    }

    // 3. CHECK DEDUP IMMEDIATELY
    const { data: existing } = await supabase
        .from("dm_logs")
        .select("id")
        .eq("comment_id", commentId)
        .maybeSingle();

    if (existing) {
        console.log(`[Webhook] Already replied to comment ${commentId}. Skipping.`);
        return;
    }

    // Find matching automations
    const { data: automations } = await supabase
        .from("automations")
        .select("*, template:dm_templates(*)")
        .eq("user_id", account.user_id)
        .eq("is_active", true);

    if (!automations || automations.length === 0) {
        console.log("[Webhook] No active automations");
        return;
    }

    // Find the best matching automation
    const automation = automations.find((a) => {
        // Check media filter
        if (a.media_id && a.media_id !== media.id) return false;

        // Check keyword filter
        if (a.trigger_keywords && a.trigger_keywords.length > 0) {
            const lowerText = text.toLowerCase();
            return a.trigger_keywords.some((kw: string) =>
                lowerText.includes(kw.toLowerCase())
            );
        }

        return true;
    });

    if (!automation || !automation.template) {
        console.log("[Webhook] No matching automation found");
        return;
    }

    // Build the message from template
    let message = automation.template.message_text;
    message = message.replace(/\{\{commenter_name\}\}/g, from.username);
    message = message.replace(/\{\{your_username\}\}/g, account.ig_username);

    const hasFollowButton = message.includes("{{follow_button}}");
    if (hasFollowButton) {
        // Remove the template tag from the string before sending
        message = message.replace(/\{\{follow_button\}\}/g, "").trim();
    }

    console.log(`[Webhook] Preparing to send DM using ${automation.template.name}. Text: "${message}"`);

    // 3. ATTEMPT TO INSERT LOG IMMEDIATELY (Soft lock)
    // We do this before the fetch so that even if the fetch is slow, 
    // a concurrent webhook retry will hit the unique constraint and stop.
    const { error: insertError } = await supabase.from("dm_logs").insert({
        automation_id: automation.id,
        comment_id: commentId,
        commenter_ig_id: from.id,
        commenter_username: from.username,
        message_sent: message,
        status: "sending",
        sent_at: new Date().toISOString(),
    });

    if (insertError) {
        console.log(`[Webhook] Could not create log for ${commentId} (likely already processing). Skipping.`);
        return;
    }

    // Prefer page_access_token (from Facebook Login) for reliable DM delivery via Pages API
    const tokenToUse = account.page_access_token || account.access_token;

    // Choose the correct endpoint depending on login method
    const baseGraphUrl = account.page_id
        ? `https://graph.facebook.com/v22.0/${account.page_id}/messages`
        : `https://graph.instagram.com/v22.0/${igUserId}/messages`;

    // Build the Instagram specific message payload
    let messagePayload: any = {
        text: message
    };

    if (hasFollowButton) {
        messagePayload = {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: message,
                    buttons: [
                        {
                            type: "web_url",
                            url: `https://instagram.com/${account.ig_username}`,
                            title: "Follow Me"
                        }
                    ]
                }
            }
        };
    }

    // Send the private reply DM
    try {
        const response = await fetch(
            baseGraphUrl,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${tokenToUse}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    recipient: { comment_id: commentId },
                    message: messagePayload,
                }),
            }
        );

        const result = await response.json();

        if (response.ok) {
            console.log("[Webhook] DM sent successfully:", result);
            await supabase.from("dm_logs")
                .update({ status: "sent" })
                .eq("comment_id", commentId);

            // PUBLIC COMMENT REPLY: If the template has a public reply enabled, post it
            if (automation.template.comment_reply_enabled && automation.template.comment_reply_text) {
                let replyText = automation.template.comment_reply_text;
                replyText = replyText.replace(/\{\{commenter_name\}\}/g, from.username);
                replyText = replyText.replace(/\{\{your_username\}\}/g, account.ig_username);

                console.log(`[Webhook] Posting public reply: "${replyText}"`);

                try {
                    const replyUrl = new URL(`https://graph.instagram.com/v22.0/${commentId}/replies`);
                    replyUrl.searchParams.set("message", replyText);
                    replyUrl.searchParams.set("access_token", tokenToUse);

                    const replyResponse = await fetch(replyUrl.toString(), {
                        method: "POST",
                    });
                    const replyResult = await replyResponse.json();
                    if (replyResponse.ok) {
                        console.log("[Webhook] Public reply posted successfully:", replyResult);
                    } else {
                        console.error("[Webhook] Public reply failed:", replyResult);
                    }
                } catch (replyError: any) {
                    console.error("[Webhook] Error posting public reply:", replyError.message);
                }
            }
        } else {
            console.error("[Webhook] DM send failed:", result);
            await supabase.from("dm_logs")
                .update({
                    status: "failed",
                    error_message: result.error?.message || JSON.stringify(result)
                })
                .eq("comment_id", commentId);
        }
    } catch (error: any) {
        console.error("[Webhook] Error sending DM:", error);
        await supabase.from("dm_logs")
            .update({
                status: "failed",
                error_message: error.message
            })
            .eq("comment_id", commentId);
    }
}
