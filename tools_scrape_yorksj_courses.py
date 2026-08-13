import json
import re
import time
from urllib.parse import urljoin, urlparse, parse_qs, unquote

import requests
from bs4 import BeautifulSoup

BASE = "https://www.yorksj.ac.uk/courses/"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; ComplianceCheckerResearch/1.0)"}
rows = {}

for start in range(1, 221, 10):
    url = BASE if start == 1 else f"{BASE}?collection=yorksj~sp-search&f.Tabs%7Cyorksj~ds-courses=Courses&profile=courses-listing&s=!showall&sort=metacourseTitle&start_rank={start}"
    response = requests.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    found = 0
    for heading in soup.find_all(["h2", "h3"]):
        link = heading.find("a", href=True)
        if not link:
            continue
        href = link["href"]
        if "yorksj-search.funnelback.squiz.cloud/s/redirect" in href:
            query = parse_qs(urlparse(href).query)
            href = query.get("url", [href])[0]
        href = unquote(href)
        if not href.startswith("https://www.yorksj.ac.uk/courses/"):
            href = urljoin(BASE, href)
        title = " ".join(link.get_text(" ", strip=True).split())
        if not title or title.lower() in {"courses", "view course"}:
            continue
        container = heading.parent
        text = " ".join(container.get_text(" ", strip=True).split()) if container else ""
        level = ""
        for candidate in ["Undergraduate", "Postgraduate Taught", "Postgraduate Research", "Degree Apprenticeship", "Foundation Year", "Professional / CPD"]:
            if candidate.lower() in text.lower():
                level = candidate
                break
        rows[href] = {"name": title, "url": href, "level": level}
        found += 1
    print(start, found, len(rows))
    if found == 0 and start > 1:
        break
    time.sleep(0.15)

with open("yorksj-course-catalogue.json", "w", encoding="utf-8") as handle:
    json.dump(sorted(rows.values(), key=lambda row: row["name"].lower()), handle, indent=2, ensure_ascii=False)
print(f"saved {len(rows)} courses")
