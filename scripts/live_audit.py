import urllib.request
import re
import json
import ssl
import sys

urls = [
    'https://pdfbolt.in/robots.txt',
    'https://pdfbolt.in/sitemap.xml',
    'https://pdfbolt.in/',
    'https://pdfbolt.in/compress-pdf/',
    'https://pdfbolt.in/merge-pdf/',
    'https://pdfbolt.in/pdf-to-word/',
    'https://pdfbolt.in/guides/how-to-compress-a-pdf/',
    'https://pdfbolt.in/guides/is-it-safe-to-upload-pdf-online/',
    'https://pdfbolt.in/about/',
    'https://pdfbolt.in/privacy/'
]

redirect_tests = [
    'http://pdfbolt.in',
    'http://pdfbolt.in/',
    'http://www.pdfbolt.in/',
    'https://www.pdfbolt.in/',
    'https://pdfbolt.in/compress-pdf',
    'https://pdfbolt.in/merge-pdf'
]

ctx = ssl.create_default_context()

print("=" * 60)
print("1. LIVE URL AUDIT")
print("=" * 60)

for u in urls:
    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'})
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            status = resp.status
            headers = dict(resp.headers)
            content = resp.read().decode('utf-8', errors='ignore')
            print(f"\n--- URL: {u} (HTTP {status}) ---")
            
            if u.endswith('.txt') or u.endswith('.xml'):
                print(content.strip())
                continue

            # Title
            title = re.search(r'<title>(.*?)</title>', content, re.I | re.S)
            title_text = title.group(1).strip() if title else 'NONE'
            print(f"Title ({len(title_text)} chars): {title_text}")

            # Meta Description
            desc = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content="([^"]*)"', content, re.I | re.S)
            if not desc:
                desc = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=\'([^\']*)\'', content, re.I | re.S)
            desc_text = desc.group(1).strip() if desc else 'NONE'
            print(f"Description ({len(desc_text)} chars): {desc_text}")

            # Canonical
            canon = re.search(r'<link[^>]*rel=["\']canonical["\'][^>]*href="([^"]*)"', content, re.I | re.S)
            if not canon:
                canon = re.search(r'<link[^>]*rel=["\']canonical["\'][^>]*href=\'([^\']*)\'', content, re.I | re.S)
            canon_text = canon.group(1).strip() if canon else 'NONE'
            print(f"Canonical: {canon_text}")

            # Robots meta
            robots = re.search(r'<meta[^>]*name=[\"\']robots[\"\'][^>]*content=[\"\'](.*?)[\"\']', content, re.I | re.S)
            print(f"Meta Robots: {robots.group(1) if robots else 'None (Indexed by default)'}")
            print(f"X-Robots-Tag: {headers.get('x-robots-tag', 'None')}")

            # H1 tags
            h1s = re.findall(r'<h1[^>]*>(.*?)</h1>', content, re.I | re.S)
            clean_h1s = [re.sub(r'<[^>]+>', '', h).strip() for h in h1s]
            print(f"H1 tags count: {len(clean_h1s)} -> {clean_h1s}")

            # Headings structure
            h2s = re.findall(r'<h2[^>]*>(.*?)</h2>', content, re.I | re.S)
            print(f"H2 tags count: {len(h2s)}")

            # Schemas
            schemas = re.findall(r'<script[^>]*type=[\"\']application/ld\+json[\"\'][^>]*>(.*?)</script>', content, re.I | re.S)
            print(f"JSON-LD Schema count: {len(schemas)}")
            for idx, s in enumerate(schemas):
                try:
                    data = json.loads(s.strip())
                    t = data.get('@type', 'Unknown')
                    print(f"  Schema {idx+1}: @type = {t}")
                except:
                    print(f"  Schema {idx+1}: parse error")

            # Check raw content size in #root
            root_start = content.find('<div id="root">')
            if root_start != -1:
                script_pos = content.find('<script', root_start)
                raw_len = script_pos - root_start if script_pos != -1 else len(content) - root_start
            else:
                raw_len = 0
            print(f"Raw HTML in #root before JS: {raw_len} chars")

    except Exception as e:
        print(f"ERROR on {u}: {e}")

print("\n" + "=" * 60)
print("2. REDIRECTS & CANONICAL FORMAT TESTS")
print("=" * 60)

class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Stop following redirect to capture the initial status code and Location header
        return None

opener = urllib.request.build_opener(NoRedirectHandler)

for r_url in redirect_tests:
    req = urllib.request.Request(r_url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        resp = opener.open(req)
        print(f"{r_url} -> Status: {resp.status} (No redirect)")
    except urllib.error.HTTPError as e:
        loc = e.headers.get('Location', 'None')
        print(f"{r_url} -> Status: {e.code} Redirects to: {loc}")
    except Exception as e:
        print(f"{r_url} -> Failed: {e}")
