/**
 * Anchor Browser API: fetch rendered webpage content (e.g. social posts) for URL extraction.
 * @see https://docs.anchorbrowser.io/api-reference/tools/get-webpage-content
 */

const ANCHOR_API_BASE = "https://api.anchorbrowser.io";

/**
 * Fetches the rendered content of a webpage. Use when the user provides a URL
 * (e.g. Instagram, TikTok) so we can send page content to Groq for extraction.
 */
export async function fetchWebpageContent(url: string): Promise<string> {
  const apiKey = process.env.ANCHOR_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANCHOR_API_KEY is not set. Get a key at https://app.anchorbrowser.io/api-key",
    );
  }

  const res = await fetch(`${ANCHOR_API_BASE}/v1/tools/fetch-webpage`, {
    method: "POST",
    headers: {
      "anchor-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      format: "markdown",
      new_page: true,
      return_partial_on_timeout: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anchor Browser fetch failed: ${res.status} ${err}`);
  }

  return res.text();
}

/** Returns true if the string looks like a URL we should fetch with Anchor. */
export function isFetchableUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}
