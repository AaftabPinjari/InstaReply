import { NextRequest, NextResponse } from "next/server";

// Redirect to Instagram OAuth
export async function GET(request: NextRequest) {
    const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || process.env.META_APP_ID;

    // Correctly detect the base URL when behind a proxy like ngrok
    const host = request.headers.get("x-forwarded-host") || request.nextUrl.host;
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;

    const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

    const scopes = [
        "instagram_basic",
        "instagram_manage_comments",
        "instagram_manage_messages",
        "pages_show_list",
        "pages_read_engagement",
        "public_profile",
        "business_management",
    ].join(",");

    // Use Facebook OAuth for Instagram Graph API (Business/Creator)
    // Changed auth_type to rerequest to force the permission selection screen
    const authUrl = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(
        redirectUri
    )}&response_type=code&scope=${scopes}&auth_type=rerequest`;

    return NextResponse.redirect(authUrl);
}
