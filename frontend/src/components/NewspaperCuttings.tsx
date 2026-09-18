import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  getLegalNews,
  type LegalNewsArticle,
} from "../services/newsApi";

export default function NewspaperCuttings() {
  const [newsItems, setNewsItems] = useState<LegalNewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setNewsItems(await getLegalNews());
    } catch (fetchError: unknown) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load legal news."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNews();
  }, [loadNews]);

  const formatDate = (publishedAt?: string | null) => {
    if (!publishedAt) {
      return "LATEST";
    }

    return new Date(publishedAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <section className="w-full bg-[#F4F0E8] px-6 py-20 md:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#8A6D1D]">
              From The Legal Desk
            </p>

            <h2 className="font-serif text-3xl font-semibold text-[#171717] md:text-5xl">
              Legal news &amp; insights
            </h2>
          </div>

          <div className="flex max-w-md items-center gap-4">
            <p className="text-sm leading-6 text-[#66615A]">
              Stay informed with important legal developments,
              court updates, and practical legal awareness.
            </p>

            <button
              type="button"
              onClick={() => void loadNews()}
              disabled={isLoading}
              aria-label="Update legal news"
              title="Update legal news"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-[#D7CFBF] bg-[#FBF9F4] text-[#171717] transition hover:border-[#C9A227] hover:text-[#8A6D1D] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {isLoading && (
          <p className="border border-[#CEC6B8] bg-[#FBF9F4] p-7 text-sm text-[#66615A]">
            Loading the latest legal news...
          </p>
        )}

        {error && (
          <p className="border border-[#CEC6B8] bg-[#FBF9F4] p-7 text-sm text-[#66615A]">
            {error} Please try again later.
          </p>
        )}

        {!isLoading && !error && (
          <div className="grid gap-6 md:grid-cols-3">
            {newsItems.map((item) => (
              <article
                key={item.title}
                className="group border border-[#CEC6B8] bg-[#FBF9F4] p-7 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center justify-between border-b border-[#D9D2C5] pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A6D1D]">
                    {item.source}
                  </span>

                  <span className="text-[10px] uppercase tracking-wider text-[#77716A]">
                    {formatDate(item.published_at)}
                  </span>
                </div>

                <div className="py-8">
                  <div className="mb-6 h-px w-12 bg-[#C9A227]" />

                  <h3 className="font-serif text-2xl font-semibold leading-tight text-[#171717] transition group-hover:text-[#8A6D1D]">
                    {item.title}
                  </h3>

                  <p className="mt-4 text-sm leading-6 text-[#66615A]">
                    {item.description}
                  </p>
                </div>

                <div className="border-t border-[#D9D2C5] pt-4">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold uppercase tracking-[0.18em] text-[#171717] transition hover:text-[#8A6D1D]"
                  >
                    Read More &rarr;
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}