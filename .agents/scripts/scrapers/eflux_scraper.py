#!/usr/bin/env python3
"""
e-flux Announcements Scraper
Scrapes current open calls from e-flux announcements page.
Follows redirects and outputs JSON to stdout.
"""

import json
import urllib.request
import ssl
import sys
from html.parser import HTMLParser


class EfluxParser(HTMLParser):
    """Parse e-flux announcements page for open call listings."""
    
    def __init__(self):
        super().__init__()
        self.results = []
        self.in_link = False
        self.current = {}
        self.current_text = ""
    
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == "a":
            href = attrs_dict.get("href", "")
            if "/announcements/" in href and href.count("/") > 2:
                if not href.startswith("http"):
                    href = f"https://www.e-flux.com{href}"
                self.current["url"] = href
                self.in_link = True
                self.current_text = ""
    
    def handle_endtag(self, tag):
        if tag == "a" and self.in_link:
            self.in_link = False
            title = self.current_text.strip()
            if title and len(title) > 10:
                self.current["name"] = title
                keywords = ["open call", "call for", "residency", "grant", "award",
                           "fellowship", "commission", "deadline", "application",
                           "appel", "bourse", "résidence", "prix", "opportunity"]
                if any(kw in title.lower() for kw in keywords):
                    self.current["funder"] = "Various (via e-flux)"
                    self.current["tags"] = "art,open-call,international"
                    self.current["source"] = "e-flux"
                    self.results.append(self.current.copy())
            self.current = {}
    
    def handle_data(self, data):
        if self.in_link:
            self.current_text += data


def fetch_with_redirects(url, max_redirects=5):
    """Fetch URL content following redirects."""
    ctx = ssl.create_default_context()
    for _ in range(max_redirects):
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        })
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            if e.code in (301, 302, 307, 308):
                url = e.headers.get("Location", "")
                if not url.startswith("http"):
                    url = f"https://www.e-flux.com{url}"
                continue
            raise
    raise Exception(f"Too many redirects for {url}")


def scrape_eflux():
    """Scrape e-flux announcements for open calls."""
    url = "https://www.e-flux.com/announcements/"
    
    try:
        html = fetch_with_redirects(url)
    except Exception as e:
        print(json.dumps({"error": str(e), "source": "e-flux"}), file=sys.stderr)
        return []
    
    parser = EfluxParser()
    parser.feed(html)

    # Deduplicate by URL
    seen = set()
    unique = []
    for r in parser.results:
        if r["url"] not in seen:
            seen.add(r["url"])
            unique.append(r)
    
    return unique


if __name__ == "__main__":
    results = scrape_eflux()
    print(json.dumps(results, indent=2, ensure_ascii=False))
    print(f"\n# Found {len(results)} potential open calls on e-flux", file=sys.stderr)
