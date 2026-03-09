#!/usr/bin/env python3
"""
Search LCSC/JLCPCB components.

Two modes of operation:
1. Web search mode (default) — uses web search to find LCSC part info
2. Direct URL mode — generates LCSC/JLCPCB search URLs for browser lookup

Usage:
    python3 scripts/search_lcsc.py "ADS1299"              # Web search
    python3 scripts/search_lcsc.py "ADS1299" --urls        # Just print search URLs
    python3 scripts/search_lcsc.py "C783432" --urls        # Look up specific LCSC part
    python3 scripts/search_lcsc.py "ADS1299" --json        # JSON output

The agent can also search LCSC directly using the browser tool or
web search for more reliable results.
"""

import sys
import json
import urllib.request
import urllib.parse
import re


def generate_search_urls(query: str) -> dict:
    """Generate search URLs for LCSC and JLCPCB."""
    encoded = urllib.parse.quote(query)
    
    urls = {
        "lcsc_search": f"https://www.lcsc.com/search?q={encoded}",
        "jlcpcb_parts": f"https://jlcpcb.com/parts/componentSearch?searchTxt={encoded}",
    }
    
    # If query looks like an LCSC part number (starts with C followed by digits)
    if re.match(r'^C\d+$', query):
        urls["lcsc_direct"] = f"https://www.lcsc.com/product-detail/{query}.html"
    
    return urls


def search_via_web(query: str) -> dict:
    """
    Search for component info by scraping LCSC search results page.
    Falls back to generating URLs if scraping fails.
    """
    urls = generate_search_urls(query)
    
    try:
        search_url = urls["lcsc_search"]
        req = urllib.request.Request(search_url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) "
                          "Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        })
        
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode("utf-8", errors="replace")
        
        # Try to extract product data from the page
        results = _parse_lcsc_html(html, query)
        
        return {
            "query": query,
            "method": "web_scrape",
            "results": results,
            "search_urls": urls,
            "note": "For detailed info, open the search URLs in a browser or use the agent's browser tool."
        }
        
    except Exception as e:
        return {
            "query": query,
            "method": "url_generation",
            "error": str(e),
            "results": [],
            "search_urls": urls,
            "note": "Web scrape failed. Use the search URLs manually or via the agent's browser tool."
        }


def _parse_lcsc_html(html: str, query: str) -> list:
    """
    Attempt to extract product info from LCSC search results HTML.
    LCSC renders most data client-side, so this extracts what's available
    in the initial HTML response.
    """
    results = []
    
    # Look for product codes (LCSC part numbers) in the HTML
    part_pattern = re.compile(r'product-detail/(C\d+)\.html')
    parts_found = list(set(part_pattern.findall(html)))
    
    # Look for JSON data that might be embedded (SSR data)
    json_patterns = [
        re.compile(r'window\.__INITIAL_STATE__\s*=\s*({.*?});', re.DOTALL),
        re.compile(r'window\.__NUXT__\s*=\s*({.*?});', re.DOTALL),
        re.compile(r'"productList"\s*:\s*(\[.*?\])', re.DOTALL),
    ]
    
    for pattern in json_patterns:
        match = pattern.search(html)
        if match:
            try:
                data = json.loads(match.group(1))
                if isinstance(data, list):
                    for item in data[:10]:
                        results.append(_extract_product_info(item))
                elif isinstance(data, dict):
                    product_list = (
                        data.get("productList", []) or
                        data.get("result", {}).get("productList", []) or
                        []
                    )
                    for item in product_list[:10]:
                        results.append(_extract_product_info(item))
                break
            except (json.JSONDecodeError, TypeError):
                continue
    
    # If no structured data found, at least return the part numbers we found
    if not results and parts_found:
        for part_code in parts_found[:10]:
            results.append({
                "lcsc_part": part_code,
                "product_url": f"https://www.lcsc.com/product-detail/{part_code}.html",
                "note": "Partial data — open URL for full details"
            })
    
    return results


def _extract_product_info(item: dict) -> dict:
    """Extract standardized product info from various JSON formats."""
    return {
        "lcsc_part": item.get("productCode", "") or item.get("lcscPartNumber", ""),
        "manufacturer": item.get("brandNameEn", "") or item.get("manufacturer", "") or item.get("brandName", ""),
        "mpn": item.get("productModel", "") or item.get("mfgPartNumber", ""),
        "description": item.get("productIntroEn", "") or item.get("description", "") or item.get("productIntro", ""),
        "package": item.get("encapStandard", "") or item.get("package", ""),
        "stock": item.get("stockNumber", "unknown"),
        "price_usd": _extract_price(item.get("productPriceList", []) or item.get("prices", [])),
        "datasheet_url": item.get("pdfUrl", "") or item.get("datasheet", ""),
        "product_url": f"https://www.lcsc.com/product-detail/{item.get('productCode', item.get('lcscPartNumber', ''))}.html",
    }


def _extract_price(price_list) -> str:
    """Extract the unit price from LCSC price tiers."""
    if not price_list:
        return "N/A"
    if isinstance(price_list, list):
        for tier in price_list:
            if isinstance(tier, dict):
                price = tier.get("productPrice") or tier.get("price")
                if price is not None:
                    return f"${float(price):.4f}"
    return "N/A"


def format_results(data: dict) -> str:
    """Format results for human-readable output."""
    lines = [
        f"LCSC Search: \"{data['query']}\"",
        f"Method: {data.get('method', 'unknown')}",
    ]
    
    if data.get("error"):
        lines.append(f"Note: {data['error']}")
    
    lines.append("")
    
    # Search URLs
    lines.append("Search URLs:")
    for name, url in data.get("search_urls", {}).items():
        lines.append(f"  {name}: {url}")
    
    lines.append("")
    
    # Results
    if data["results"]:
        lines.append(f"Found {len(data['results'])} results:")
        lines.append("=" * 60)
        for i, r in enumerate(data["results"], 1):
            lines.append(f"\n{i}. {r.get('lcsc_part', 'N/A')}")
            if r.get("mpn"):
                lines.append(f"   MPN:          {r['mpn']}")
            if r.get("manufacturer"):
                lines.append(f"   Manufacturer: {r['manufacturer']}")
            if r.get("description"):
                lines.append(f"   Description:  {r['description']}")
            if r.get("package"):
                lines.append(f"   Package:      {r['package']}")
            if r.get("stock") and r.get("stock") != "unknown":
                lines.append(f"   Stock:        {r['stock']}")
            if r.get("price_usd") and r.get("price_usd") != "N/A":
                lines.append(f"   Price:        {r['price_usd']}")
            if r.get("product_url"):
                lines.append(f"   URL:          {r['product_url']}")
    else:
        lines.append("No results extracted from HTML.")
        lines.append("Tip: Use the search URLs above in a browser, or ask the agent to search via browser tool.")
    
    if data.get("note"):
        lines.append(f"\n{data['note']}")
    
    return "\n".join(lines)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 search_lcsc.py <query> [--json] [--urls]")
        print("  e.g. python3 search_lcsc.py 'ADS1299'")
        print("  e.g. python3 search_lcsc.py 'C783432' --urls")
        print("  e.g. python3 search_lcsc.py '100nF 0402' --json")
        sys.exit(1)

    query = sys.argv[1]
    output_json = "--json" in sys.argv
    urls_only = "--urls" in sys.argv

    if urls_only:
        urls = generate_search_urls(query)
        if output_json:
            print(json.dumps(urls, indent=2))
        else:
            print(f"Search URLs for \"{query}\":")
            for name, url in urls.items():
                print(f"  {name}: {url}")
    else:
        data = search_via_web(query)
        if output_json:
            print(json.dumps(data, indent=2))
        else:
            print(format_results(data))
