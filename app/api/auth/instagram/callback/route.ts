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
        // 1. Exchange code for User Access Token
        const tokenUrl = "https://api.instagram.com/oauth/access_token";

        // Force https for the redirect_uri if we're behind a proxy (like ngrok)
        const exchangeRedirectUri = baseUrl.includes("localhost")
            ? `${baseUrl}/api/auth/instagram/callback`
            : `${baseUrl.replace("http://", "https://")}/api/auth/instagram/callback`;

        const params = new URLSearchParams();
        params.append("client_id", process.env.META_APP_ID!);
        params.append("client_secret", process.env.META_APP_SECRET!);
        params.append("redirect_uri", exchangeRedirectUri);
        params.append("code", code);
        params.append("grant_type", "authorization_code");

        const fbTokenRes = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        });

        const fbTokenData = await fbTokenRes.json();

        if (!fbTokenRes.ok || !fbTokenData.access_token) {
            console.error("[OAuth] FB Token exchange failed:", JSON.stringify(fbTokenData, null, 2));
            const fbError = fbTokenData?.error?.message || JSON.stringify(fbTokenData);
            // Temporary debug: show partial env values to verify Vercel config
            const secret = process.env.META_APP_SECRET || "MISSING";
            const debugInfo = `secret_start=${secret.slice(0, 4)}...${secret.slice(-4)}_appid=${process.env.META_APP_ID || "MISSING"}_status=${fbTokenRes.status}`;
            return NextResponse.redirect(
                `${baseUrl}/dashboard/accounts?error=token_exchange_failed&message=${encodeURIComponent(fbError)}&debug=${encodeURIComponent(debugInfo)}`
            );
        }

        const fbAccessToken = fbTokenData.access_token;

        // 2. Get the long-lived Instagram token 
        const longTokenUrl = new URL("https://graph.instagram.com/access_token");
        longTokenUrl.searchParams.append("grant_type", "ig_exchange_token");
        longTokenUrl.searchParams.append("client_secret", process.env.META_APP_SECRET!);
        longTokenUrl.searchParams.append("access_token", fbAccessToken);

        let accessToken = fbAccessToken;
        let expiresIn = 5184000;

        try {
            const longTokenRes = await fetch(longTokenUrl.toString());
            const longTokenData = await longTokenRes.json();
            if (longTokenData.access_token) {
                accessToken = longTokenData.access_token;
                expiresIn = longTokenData.expires_in || expiresIn;
            } else {
                console.warn("[OAuth] Failed to get long-lived IG token, using short-lived", longTokenData);
            }
        } catch (e) {
            console.error("[OAuth] Error fetching long-lived token", e);
        }

        // 3. Get Instagram Business Account Info directly from IG Graph API
        const igUserRes = await fetch(
            `https://graph.instagram.com/v22.0/me?fields=id,username,name,profile_picture_url&access_token=${accessToken}`
        );
        const igUserData = await igUserRes.json();

        console.log("[OAuth] IG User data received:", JSON.stringify(igUserData, null, 2));

        if (igUserData.error) {
            console.error("[OAuth] IG API Error:", igUserData.error);
            return NextResponse.redirect(
                `${baseUrl}/dashboard/accounts?error=ig_api_error&message=${encodeURIComponent(igUserData.error.message)}`
            );
        }

        if (!igUserData.id) {
            console.error("[OAuth] No Instagram Account data returned");
            return NextResponse.redirect(
                `${baseUrl}/dashboard/accounts?error=no_ig_business_account&perms=unknown&count=0`
            );
        }

        const igAccount = {
            id: igUserData.id,
            username: igUserData.username,
            name: igUserData.name,
            profile_picture_url: igUserData.profile_picture_url
        };

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
                page_id: null,
                page_access_token: null,
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
