import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");

    // Correctly detect the base URL when behind a proxy like ngrok
    const host = request.headers.get("x-forwarded-host") || request.nextUrl.host;
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;

    if (error || !code) {
        return NextResponse.redirect(
            `${baseUrl}/dashboard/accounts?error=${error || "no_code"}`
        );
    }

    try {
        // 1. Exchange code for Facebook User Access Token
        const url = new URL("https://graph.facebook.com/v22.0/oauth/access_token");
        url.searchParams.append("client_id", process.env.META_APP_ID!);
        url.searchParams.append("client_secret", process.env.META_APP_SECRET!);
        url.searchParams.append("redirect_uri", `${baseUrl}/api/auth/instagram/callback`);
        url.searchParams.append("code", code);

        const fbTokenRes = await fetch(url.toString());
        const fbTokenData = await fbTokenRes.json();

        if (!fbTokenRes.ok || !fbTokenData.access_token) {
            console.error("[OAuth] FB Token exchange failed:", fbTokenData);
            const fbError = fbTokenData?.error?.message || JSON.stringify(fbTokenData);
            return NextResponse.redirect(
                `${baseUrl}/dashboard/accounts?error=token_exchange_failed&message=${encodeURIComponent(fbError)}`
            );
        }

        const fbAccessToken = fbTokenData.access_token;

        // 2. Get the long-lived token (Optional but recommended for business apps)
        const longTokenUrl = new URL("https://graph.facebook.com/v22.0/oauth/access_token");
        longTokenUrl.searchParams.append("grant_type", "fb_exchange_token");
        longTokenUrl.searchParams.append("client_id", process.env.META_APP_ID!);
        longTokenUrl.searchParams.append("client_secret", process.env.META_APP_SECRET!);
        longTokenUrl.searchParams.append("fb_exchange_token", fbAccessToken);

        const longTokenRes = await fetch(longTokenUrl.toString());
        const longTokenData = await longTokenRes.json();
        const accessToken = longTokenData.access_token || fbAccessToken;
        const expiresIn = longTokenData.expires_in || 5184000;

        // 3. Find connected Instagram Business Accounts via Facebook Pages
        const pagesRes = await fetch(
            `https://graph.facebook.com/v22.0/me/accounts?fields=name,access_token,instagram_business_account{id,username,profile_picture_url}&access_token=${accessToken}`
        );
        const pagesData = await pagesRes.json();

        // Log what we got back from Meta
        console.log("[OAuth] Pages data received from Meta:", JSON.stringify(pagesData, null, 2));

        if (pagesData.error) {
            console.error("[OAuth] Meta API Error:", pagesData.error);
            // Check for potential permission issues
            const permissionRes = await fetch(`https://graph.facebook.com/v22.0/me/permissions?access_token=${accessToken}`);
            const permissionData = await permissionRes.json();
            console.log("[OAuth] Granted Permissions:", JSON.stringify(permissionData, null, 2));

            return NextResponse.redirect(
                `${baseUrl}/dashboard/accounts?error=meta_api_error&message=${encodeURIComponent(pagesData.error.message)}`
            );
        }

        if (!pagesData.data || pagesData.data.length === 0) {
            const permissionRes = await fetch(`https://graph.facebook.com/v22.0/me/permissions?access_token=${accessToken}`);
            const pData = await permissionRes.json();
            const granted = (pData.data || [])
                .filter((p: any) => p.status === "granted")
                .map((p: any) => p.permission)
                .join(",");

            console.error("[OAuth] No Facebook Pages found connected to this account");
            return NextResponse.redirect(
                `${baseUrl}/dashboard/accounts?error=no_pages_found&perms=${granted}&count=0`
            );
        }

        // Find the first Page that has an Instagram Business Account linked
        const pageWithIg = pagesData.data.find((p: any) => p.instagram_business_account);

        if (!pageWithIg) {
            const permissionRes = await fetch(`https://graph.facebook.com/v22.0/me/permissions?access_token=${accessToken}`);
            const pData = await permissionRes.json();
            const granted = (pData.data || [])
                .filter((p: any) => p.status === "granted")
                .map((p: any) => p.permission)
                .join(",");

            console.error("[OAuth] No Instagram Business Account linked to these Facebook Pages");
            return NextResponse.redirect(
                `${baseUrl}/dashboard/accounts?error=no_ig_business_account&perms=${granted}&count=${pagesData.data.length}`
            );
        }

        const igAccount = pageWithIg.instagram_business_account;

        // 4. Save to database
        // Use the session-aware client to identify the logged-in user
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.redirect(`${baseUrl}/login`);
        }

        // Use a service-role client for database reads/writes to bypass RLS.
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
            // Another user currently has this IG account connected → block it
            console.error(`[OAuth] IG account @${igAccount.username} is already connected to another user.`);
            return NextResponse.redirect(
                `${baseUrl}/dashboard/accounts?error=already_connected&message=${encodeURIComponent(
                    `@${igAccount.username || igAccount.id} is already connected to another InstaReply account. The other user must disconnect it first.`
                )}`
            );
        }

        // Either the account doesn't exist (fresh connect) or belongs to this user (reconnect)
        const expiresAt = new Date(
            Date.now() + expiresIn * 1000
        ).toISOString();

        const { error: upsertError } = await adminSupabase.from("instagram_accounts").upsert(
            {
                user_id: user.id,
                ig_user_id: String(igAccount.id),
                ig_username: igAccount.username || "",
                access_token: accessToken,
                token_expires_at: expiresAt,
                connected_at: new Date().toISOString(),
                page_id: pageWithIg.id,
                page_access_token: pageWithIg.access_token,
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
