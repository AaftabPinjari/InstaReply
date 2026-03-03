import { NextRequest, NextResponse } from "next/server";

// Redirect to Facebook Login OAuth (gives access to Page ID + IG account)
export async function GET(request: NextRequest) {
    const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || process.env.META_APP_ID;

    // Correctly detect the base URL when behind a proxy
    const host = request.headers.get("x-forwarded-host") || request.nextUrl.host;
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;

    const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

    // Facebook Login scopes that give access to Pages + Instagram
    const scopes = [
        "pages_show_list",
        "pages_messaging",
        "instagram_basic",
        "instagram_manage_comments",
        "instagram_manage_messages",
    ].join(",");

    // Use Facebook OAuth endpoint instead of Instagram OAuth
    const authUrl = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(
        redirectUri
    )}&response_type=code&scope=${scopes}`;

    return NextResponse.redirect(authUrl);
}
