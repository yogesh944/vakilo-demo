const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export interface LegalNewsArticle {
  title: string;
  description: string;
  url: string;
  image?: string | null;
  published_at?: string | null;
  source: string;
}

interface LegalNewsResponse {
  articles: LegalNewsArticle[];
}

export async function getLegalNews(
  limit = 3
): Promise<LegalNewsArticle[]> {
  const response = await fetch(`${API_URL}/news/legal?limit=${limit}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    let message = "Unable to load legal news.";

    try {
      const data = await response.json();
      if (typeof data.detail === "string") {
        message = data.detail;
      }
    } catch {
      // Keep the default message when the response is not JSON.
    }

    throw new Error(message);
  }

  const data = (await response.json()) as LegalNewsResponse;
  return data.articles;
}
