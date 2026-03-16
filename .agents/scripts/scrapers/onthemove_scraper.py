#!/usr/bin/env python3
"""
On The Move Funding Database Scraper
Scrapes funding opportunities from on-the-move.org.
Follows redirects and outputs JSON to stdout.
"""

import json
import urllib.request
import ssl
import sys
from html.parser import HTMLParser


class OTMParser(HTMLParser):
    """Parse On The Move funding listings."""
    
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
            if "/funding/" in href or "/resource/" in href:
                if not href.startswith("http"):
                    href = f"https://on-the-move.org{href}"
                self.current["url"] = href
                self.in_link = True
                self.current_text = ""
    
    def handle_endtag(self, tag):
        if tag == "a" and self.in_link:
            self.in_link = False
            title = self.current_text.strip()
            if title and len(title) > 10:
                self.current["name"] = title
                self.current["funder"] = "Various (via On The Move)"
                self.current["tags"] = "mobility,EU,international,cultural-exchange"
                self.current["source"] = "on-the-move"
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
                    url = f"https://on-the-move.org{url}"
                continue
            raise
    raise Exception(f"Too many redirects for {url}")


def scrape_otm():
    """Scrape On The Move funding database."""
    url = "https://on-the-move.org/funding"
    
    try:
        html = fetch_with_redirects(url)
    except Exception as e:
        print(json.dumps({"error": str(e), "source": "on-the-move"}), file=sys.stderr)
        return []
    
    parser = OTMParser()
    parser.feed(html)
    
    # Deduplicate
    seen = set()
    unique = []
    for r in parser.results:
        if r["url"] not in seen:
            seen.add(r["url"])
            unique.append(r)
    
    return unique


if __name__ == "__main__":
    results = scrape_otm()
    print(json.dumps(results, indent=2, ensure_ascii=False))
    print(f"\n# Found {len(results)} funding opportunities on On The Move", file=sys.stderr)
