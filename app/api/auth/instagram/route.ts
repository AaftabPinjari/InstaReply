import { NextRequest, NextResponse } from "next/server";

// Redirect to Instagram OAuth
export async function GET(request: NextRequest) {
    const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || process.env.META_APP_ID;

    // Correctly detect the base URL when behind a proxy like ngrok
    const host = request.headers.get("x-forwarded-host") || request.nextUrl.host;
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;

    const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

    // Strictly only Instagram Business scopes for the dedicated Instagram flow
    const scopes = [
        "instagram_business_basic",
        "instagram_business_manage_messages",
        "instagram_business_manage_comments",
        "instagram_business_content_publish",
        "instagram_business_manage_insights"
    ].join(",");

    // Switched to the dedicated Instagram Business Login endpoint
    const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(
        redirectUri
    )}&response_type=code&scope=${scopes}&force_reauth=true`;

    return NextResponse.redirect(authUrl);
}
