import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InstaReply — Auto-DM Your Instagram Commenters",
  description:
    "Turn every Instagram comment into a conversation. Automatically send personalized DMs to anyone who comments on your posts — drive followers, engagement, and sales.",
  keywords: [
    "instagram automation",
    "instagram DM",
    "comment to DM",
    "instagram marketing",
    "auto reply",
  ],
};

import Providers from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
