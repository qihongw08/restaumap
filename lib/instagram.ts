/**
 * Instagram URL normalization and caption fetching.
 * Reel/post links often include ?utm_medium=... etc. which we strip so the link is stable.
 * Caption is fetched via Instagram's internal GraphQL (no official API, no Python).
 */

/** Matches Instagram post/reel/reels/tv/stories and captures path type and shortcode. Optional username segment and query string supported. */
const INSTAGRAM_POST_RE =
  /instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(p|reels|reel|tv|stories)\/([A-Za-z0-9_-]+)/i;

/** Full URL match for normalization: capture base URL without query. */
const INSTAGRAM_URL_RE = new RegExp(
  `(https?://(?:www\\.)?${INSTAGRAM_POST_RE.source})(?:\\?[^#\\s]*)?`,
  "i",
);

export function isInstagramUrl(url: string): boolean {
  return INSTAGRAM_POST_RE.test(url.trim());
}

/**
 * Extract shortcode (media id) from an Instagram URL.
 */
export function getInstagramId(url: string): string | null {
  const match = url.trim().match(INSTAGRAM_POST_RE);
  return match?.[2] ?? null;
}

/**
 * Normalize an Instagram URL by stripping query params (e.g. ?utm_medium=copy).
 * Returns the clean canonical URL, or null if not an Instagram post/reel/tv URL.
 */
export function normalizeInstagramUrl(url: string): string | null {
  const trimmed = url.trim();
  const match = trimmed.match(INSTAGRAM_URL_RE);
  if (!match) return null;
  const base = match[1];
  return base.endsWith("/") ? base : `${base}/`;
}

export type InstagramCaptionResult = {
  caption: string | null;
  shortcode?: string;
  error?: string;
};

/** Instagram web app ID (public). */
const X_IG_APP_ID = "936619743392459";

/**
 * Fetch post caption (and location) via Instagram's internal GraphQL.
 * No Python or official API required.
 */
export async function getInstagramCaption(
  instagramUrl: string,
  maxRetries: number = 2,
  currentRetry: number = 0,
): Promise<InstagramCaptionResult> {
  if (currentRetry >= maxRetries) {
    return { caption: null, error: "Max retries reached" };
  }

  const normalized = normalizeInstagramUrl(instagramUrl);
  const url = normalized ?? instagramUrl.trim();
  const shortcode = getInstagramId(url);
  if (!shortcode) {
    return { caption: null, error: "Could not parse shortcode from URL" };
  }

  const body = new URLSearchParams({
    variables: JSON.stringify({ shortcode }),
    doc_id: "10015901848480474",
    lsd: "AVqbxe3J_YA",
  });

  try {
    const response = await fetch("https://www.instagram.com/api/graphql", {
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "X-IG-App-ID": X_IG_APP_ID,
        "X-FB-LSD": "AVqbxe3J_YA",
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "*/*",
        Origin: "https://www.instagram.com",
        Referer: "https://www.instagram.com/",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "cors",
      },
      body: body.toString(),
    });

    const contentType = response.headers.get("content-type") ?? "";
    const isLikelyJson =
      contentType.includes("application/json") ||
      contentType.includes("text/javascript");

    if (!response.ok) {
      return await getInstagramCaption(
        instagramUrl,
        maxRetries,
        currentRetry + 1,
      );
    }

    if (!isLikelyJson) {
      return {
        caption: null,
        error: "Instagram returned non-JSON; caption unavailable",
      };
    }

    const text = await response.text();
    let json: {
      data?: {
        xdt_shortcode_media?: {
          edge_media_to_caption?: {
            edges?: Array<{ node?: { text?: string } }>;
          };
        };
      };
    };
    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      return await getInstagramCaption(
        instagramUrl,
        maxRetries,
        currentRetry + 1,
      );
    }

    const media = json?.data?.xdt_shortcode_media;
    const caption =
      media?.edge_media_to_caption?.edges?.[0]?.node?.text ?? null;

    return { caption, shortcode };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { caption: null, error: message };
  }
}
