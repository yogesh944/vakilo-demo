import json
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.core.config import settings


GNEWS_URL = "https://gnews.io/api/v4/search"
CACHE_TTL_SECONDS = 300
_cached_articles: list[dict] = []
_cache_expires_at = 0.0
FALLBACK_ARTICLES = [
    {
        "title": "Supreme Court of India: Latest Judgments",
        "description": "Browse recent judgments and orders published by the Supreme Court of India.",
        "url": "https://www.sci.gov.in/judgements/",
        "image": None,
        "published_at": None,
        "source": "Supreme Court of India",
    },
    {
        "title": "India Code: Central Laws and Regulations",
        "description": "Find the latest central Acts, rules, and regulations in the India Code database.",
        "url": "https://www.indiacode.nic.in/",
        "image": None,
        "published_at": None,
        "source": "India Code",
    },
    {
        "title": "Law Commission of India: Reports and Updates",
        "description": "Read reports and legal reform updates from the Law Commission of India.",
        "url": "https://lawcommissionofindia.nic.in/",
        "image": None,
        "published_at": None,
        "source": "Law Commission of India",
    },
]


def get_legal_news(limit: int = 3) -> list[dict]:
    global _cached_articles, _cache_expires_at

    now = time.monotonic()
    if _cached_articles and now < _cache_expires_at:
        return _cached_articles[:limit]

    if not settings.GNEWS_API_KEY:
        return FALLBACK_ARTICLES[:limit]

    query = urlencode(
        {
            "q": "legal India court law",
            "lang": "en",
            "country": "in",
            "max": limit,
            "apikey": settings.GNEWS_API_KEY,
        }
    )
    request = Request(
        f"{GNEWS_URL}?{query}",
        headers={"Accept": "application/json"},
    )

    try:
        with urlopen(request, timeout=10) as response:
            payload = json.load(response)
    except Exception:
        if _cached_articles:
            return _cached_articles[:limit]
        return FALLBACK_ARTICLES[:limit]

    articles = [
        {
            "title": article.get("title", "Untitled article"),
            "description": article.get("description") or "Read the latest legal developments.",
            "url": article.get("url", ""),
            "image": article.get("image"),
            "published_at": article.get("publishedAt"),
            "source": (article.get("source") or {}).get("name", "GNews"),
        }
        for article in payload.get("articles", [])
    ]

    _cached_articles = articles
    _cache_expires_at = now + CACHE_TTL_SECONDS
    return articles[:limit]