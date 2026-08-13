import json
import re
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

university_id = "abc6a6f4-d38d-4bd4-b0db-3ca6aa1f22d6"
rows = json.loads(Path("yorksj-course-catalogue.json").read_text(encoding="utf-8"))

def sql(value):
    return "'" + value.replace("'", "''") + "'"

def level(row):
    url = row["url"]
    if "/professional-and-short-courses/" in url:
        return "Professional / CPD"
    if "/postgraduate/" in url:
        return "Postgraduate Research" if any(token in url for token in ["/phds-and-doctorates/", "/mres/"]) else "Postgraduate Taught"
    return "Undergraduate"

lines = [
    "-- York St John University official course catalogue seed.",
    "-- Source: https://www.yorksj.ac.uk/courses/ (217 results observed 2026-08-13).",
    "-- Programme requirements remain empty unless explicitly verified in a separate rule migration.",
    "",
    "update public.programmes set name = 'Nursing (Adult) BSc (Hons)' where id = 'e61ea5c8-751d-4a15-b8d4-e5505faf436f' and lower(name) = 'bsc nursing';",
    "",
]
for row in rows:
    name = row["name"]
    url = row["url"]
    ident = str(uuid5(NAMESPACE_URL, f"yorksj:{url}"))
    requirements = json.dumps({"provider": "York St John University", "catalogUrl": url}, ensure_ascii=False).replace("'", "''")
    lines.append(
        "insert into public.programmes (id, university_id, name, level, requirements, created_at) "
        f"select '{ident}', '{university_id}', {sql(name)}, {sql(level(row))}, '{requirements}'::jsonb, now() "
        f"where not exists (select 1 from public.programmes where university_id = '{university_id}' and lower(name) = lower({sql(name)}));"
    )

Path("supabase/migrations/202608131930_seed_yorksj_course_catalogue.sql").write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"generated {len(rows)} catalogue statements")
