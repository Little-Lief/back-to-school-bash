import type { Context } from "https://edge.netlify.com";

const BOT_UA =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|Slackbot|Discordbot/i;

const OG_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Jones Gym | 4th Annual Back to School Bash</title>
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://event.thejonesgym.com">
  <meta property="og:title" content="Jones Gym | 4th Annual Back to School Bash">
  <meta property="og:description" content="A free community event giving kids backpacks, school supplies, food, and more. August 15, 2026 — Sponsor, volunteer, or participate!">
  <meta property="og:image" content="https://event.thejonesgym.com/og-image.png">
  <meta property="og:image:secure_url" content="https://event.thejonesgym.com/og-image.png">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Jones Gym | 4th Annual Back to School Bash">
  <meta name="twitter:description" content="A free community event giving kids backpacks, school supplies, food, and more. August 15, 2026 — Sponsor, volunteer, or participate!">
  <meta name="twitter:image" content="https://event.thejonesgym.com/og-image.png">
</head>
<body>
  <h1>Jones Gym | 4th Annual Back to School Bash</h1>
  <p>A free community event giving kids backpacks, school supplies, food, and more. August 15, 2026 — Sponsor, volunteer, or participate!</p>
</body>
</html>`;

const STATIC_EXT = /\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|js|css|json|txt|xml|pdf)$/i;

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  if (STATIC_EXT.test(url.pathname)) return context.next();

  const ua = request.headers.get("user-agent") ?? "";
  if (BOT_UA.test(ua)) {
    return new Response(OG_HTML, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  return context.next();
};
