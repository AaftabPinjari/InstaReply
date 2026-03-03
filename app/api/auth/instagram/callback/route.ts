import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");

    // Correctly detect the base URL when behind a proxy
    const host = request.headers.get("x-forwarded-host") || request.nextUrl.host;
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;

    if (error || !code) {
        return NextResponse.redirect(
            `${baseUrl}/dashboard/accounts?error=${error || "no_code"}`
        );
    }

    try {
        // Force https for the redirect_uri if we're behind a proxy
        const exchangeRedirectUri = baseUrl.includes("localhost")
            ? `${baseUrl}/api/auth/instagram/callback`
            : `${baseUrl.replace("http://", "https://")}/api/auth/instagram/callback`;

        // ============================================================
        // STEP 1: Exchange code for Facebook User Access Token
        // ============================================================
        const tokenUrl = new URL("https://graph.facebook.com/v22.0/oauth/access_token");
        tokenUrl.searchParams.append("client_id", process.env.META_APP_ID!);
        tokenUrl.searchParams.append("client_secret", process.env.META_APP_SECRET!);
        tokenUrl.searchParams.append("redirect_uri", exchangeRedirectUri);
        tokenUrl.searchParams.append("code", code);

        const fbTokenRes = await fetch(tokenUrl.toString());
        const fbTokenData = await fbTokenRes.json();

        if (!fbTokenRes.ok || !fbTokenData.access_token) {
            console.error("[OAuth] FB Token exchange failed:", JSON.stringify(fbTokenData, null, 2));
            const fbError = fbTokenData?.error?.message || JSON.stringify(fbTokenData);
            return NextResponse.redirect(
                `${baseUrl}/dashboard/accounts?error=token_exchange_failed&message=${encodeURIComponent(fbError)}`
            );
        }

        const shortLivedToken = fbTokenData.access_token;

        // ============================================================
        // STEP 2: Exchange for Long-Lived User Token (~60 days)
        // ============================================================
        const longTokenUrl = new URL("https://graph.facebook.com/v22.0/oauth/access_token");
        longTokenUrl.searchParams.append("grant_type", "fb_exchange_token");
        longTokenUrl.searchParams.append("client_id", process.env.META_APP_ID!);
        longTokenUrl.searchParams.append("client_secret", process.env.META_APP_SECRET!);
        longTokenUrl.searchParams.append("fb_exchange_token", shortLivedToken);

        let userAccessToken = shortLivedToken;
        let expiresIn = 5184000; // default 60 days

        try {
            const longTokenRes = await fetch(longTokenUrl.toString());
            const longTokenData = await longTokenRes.json();
            if (longTokenData.access_token) {
                userAccessToken = longTokenData.access_token;
                expiresIn = longTokenData.expires_in || expiresIn;
                console.log("[OAuth] Got long-lived user token");
            } else {
                console.warn("[OAuth] Failed to get long-lived token, using short-lived:", longTokenData);
            }
        } catch (e) {
            console.error("[OAuth] Error fetching long-lived token:", e);
        }

        // ============================================================
        // STEP 3: Get user's Facebook Pages
        // ============================================================
        const pagesRes = await fetch(
            `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userAccessToken}`
        );
        const pagesData = await pagesRes.json();

        console.log("[OAuth] Pages data:", JSON.stringify(pagesData, null, 2));

        if (pagesData.error) {
            console.error("[OAuth] Pages API error:", pagesData.error);
            return NextResponse.redirect(
                `${baseUrl}/dashboard/accounts?error=pages_api_error&message=${encodeURIComponent(pagesData.error.message)}`
            );
        }

        const pages = pagesData.data || [];
        if (pages.length === 0) {
            return NextResponse.redirect(
                `${baseUrl}/dashboard/accounts?error=no_pages&message=${encodeURIComponent(
                    "No Facebook Pages found. Make sure you have a Facebook Page linked to your Instagram Business account."
                )}`
            );
        }

        // ============================================================
        // STEP 4: Find the Page with a linked Instagram Business Account
        // ============================================================
        let selectedPage: { id: string; name: string; access_token: string } | null = null;
        let igBusinessAccountId: string | null = null;

        for (const page of pages) {
            if (page.instagram_business_account) {
                selectedPage = page;
                igBusinessAccountId = page.instagram_business_account.id;
                break;
            }
        }

        if (!selectedPage || !igBusinessAccountId) {
            // Try fetching IG account for each page individually (sometimes not returned in bulk)
            for (const page of pages) {
                try {
                    const pageIgRes = await fetch(
                        `https://graph.facebook.com/v22.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
                    );
                    const pageIgData = await pageIgRes.json();
                    if (pageIgData.instagram_business_account) {
                        selectedPage = page;
                        igBusinessAccountId = pageIgData.instagram_business_account.id;
                        break;
                    }
                } catch (e) {
                    console.warn(`[OAuth] Failed to check IG for page ${page.id}:`, e);
                }
            }
        }

        if (!selectedPage || !igBusinessAccountId) {
            return NextResponse.redirect(
                `${baseUrl}/dashboard/accounts?error=no_ig_business_account&message=${encodeURIComponent(
                    "None of your Facebook Pages have a linked Instagram Business account. Please link your Instagram account to a Facebook Page first."
                )}`
            );
        }

        console.log(`[OAuth] Found IG Business Account ${igBusinessAccountId} on Page ${selectedPage.id} (${selectedPage.name})`);

        // ============================================================
        // STEP 5: Get Instagram Account details
        // ============================================================
        const igUserRes = await fetch(
            `https://graph.facebook.com/v22.0/${igBusinessAccountId}?fields=id,username,name,profile_picture_url&access_token=${selectedPage.access_token}`
        );
        const igUserData = await igUserRes.json();

        console.log("[OAuth] IG User data:", JSON.stringify(igUserData, null, 2));

        if (igUserData.error) {
            console.error("[OAuth] IG API Error:", igUserData.error);
            return NextResponse.redirect(
                `${baseUrl}/dashboard/accounts?error=ig_api_error&message=${encodeURIComponent(igUserData.error.message)}`
            );
        }

        const igAccount = {
            id: igBusinessAccountId,
            username: igUserData.username || "",
            name: igUserData.name || "",
            profile_picture_url: igUserData.profile_picture_url || "",
        };

        // ============================================================
        // STEP 6: Save to database
        // ============================================================
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.redirect(`${baseUrl}/login`);
        }

        // Use a service-role client for database reads/writes to bypass RLS
        const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
        const adminSupabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Check if this Instagram account is already connected to another user
        const { data: existingAccount } = await adminSupabase
            .from("instagram_accounts")
            .select("user_id, ig_username")
            .eq("ig_user_id", String(igAccount.id))
            .maybeSingle();

        if (existingAccount && existingAccount.user_id !== user.id) {
            console.error(`[OAuth] IG account @${igAccount.username} is already connected to another user.`);
            return NextResponse.redirect(
                `${baseUrl}/dashboard/accounts?error=already_connected&message=${encodeURIComponent(
                    `@${igAccount.username || igAccount.id} is already connected to another InstaReply account. The other user must disconnect it first.`
                )}`
            );
        }

        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        // ============================================================
        // STEP 7: Subscribe to Instagram webhooks using Page Access Token
        // ============================================================
        try {
            const subscribeUrl = new URL(`https://graph.instagram.com/v22.0/${igAccount.id}/subscribed_apps`);
            subscribeUrl.searchParams.append("subscribed_fields", "comments,messages");
            subscribeUrl.searchParams.append("access_token", selectedPage.access_token);

            const subscribeRes = await fetch(subscribeUrl.toString(), { method: "POST" });
            const subscribeData = await subscribeRes.json();

            if (subscribeData.success) {
                console.log(`[OAuth] Successfully subscribed to webhooks for @${igAccount.username}`);
            } else {
                console.warn(`[OAuth] Webhook subscription failed for @${igAccount.username}:`, subscribeData);
            }
        } catch (e) {
            console.error(`[OAuth] Network error making webhook subscription for @${igAccount.username}:`, e);
        }

        // Upsert the account with Page ID and Page Access Token
        const { error: upsertError } = await adminSupabase.from("instagram_accounts").upsert(
            {
                user_id: user.id,
                ig_user_id: String(igAccount.id),
                ig_username: igAccount.username,
                access_token: userAccessToken,
                token_expires_at: expiresAt,
                connected_at: new Date().toISOString(),
                page_id: selectedPage.id,
                page_access_token: selectedPage.access_token,
            },
            { onConflict: "ig_user_id" }
        );

        if (upsertError) {
            console.error("[OAuth] Database Upsert Error:", upsertError);
            return NextResponse.redirect(
                `${baseUrl}/dashboard/accounts?error=database_error&message=${encodeURIComponent(upsertError.message)}`
            );
        }

        return NextResponse.redirect(
            `${baseUrl}/dashboard/accounts?success=connected`
        );
    } catch (err: any) {
        console.error("[OAuth] Callback error:", err);
        return NextResponse.redirect(
            `${baseUrl}/dashboard/accounts?error=callback_error`
        );
    }
}
