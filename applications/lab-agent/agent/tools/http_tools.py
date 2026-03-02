"""
HTTP tools: make HTTP requests to any URL.
"""

import urllib.request
import urllib.error
import json


def http_request(url: str, method: str = "GET", body: str = "", headers: str = "") -> str:
    """Make an HTTP request and return the response."""
    try:
        data = body.encode("utf-8") if body else None
        req = urllib.request.Request(url, data=data, method=method.upper())
        req.add_header("User-Agent", "SyntheticaLabAgent/1.0")

        # Parse custom headers (format: "Key: Value\nKey2: Value2")
        if headers:
            for line in headers.strip().split("\n"):
                if ": " in line:
                    key, val = line.split(": ", 1)
                    req.add_header(key.strip(), val.strip())

        if body and "Content-Type" not in (headers or ""):
            req.add_header("Content-Type", "application/json")

        with urllib.request.urlopen(req, timeout=30) as resp:
            response_body = resp.read().decode("utf-8", errors="replace")
            status = resp.status
            # Try to pretty-print JSON
            try:
                parsed = json.loads(response_body)
                response_body = json.dumps(parsed, indent=2)
            except (json.JSONDecodeError, ValueError):
                pass
            # Truncate
            if len(response_body) > 10000:
                response_body = response_body[:10000] + "\n... [TRUNCATED]"
            return f"HTTP {status}\n{response_body}"

    except urllib.error.HTTPError as e:
        body_text = e.read().decode("utf-8", errors="replace") if e.fp else ""
        return f"HTTP {e.code}: {e.reason}\n{body_text}"
    except urllib.error.URLError as e:
        return f"ERROR: Connection failed: {e.reason}"
    except Exception as e:
        return f"ERROR: {type(e).__name__}: {e}"


HTTP_TOOLS = {
    "http_request": {
        "function": http_request,
        "description": "Make an HTTP request to any URL. Use for calling machine APIs, web services, etc.",
        "parameters": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "URL to request"},
                "method": {"type": "string", "description": "HTTP method (GET, POST, PUT, DELETE)", "default": "GET"},
                "body": {"type": "string", "description": "Request body (for POST/PUT)", "default": ""},
                "headers": {"type": "string", "description": "Custom headers, one per line: 'Key: Value'", "default": ""},
            },
            "required": ["url"],
        },
    },
}
