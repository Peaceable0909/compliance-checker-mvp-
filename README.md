# Compliance Checker — static site

A plain HTML/CSS/JS rebuild of the compliance checker, built to deploy on
GitHub Pages with **no Node server** — it talks to Supabase directly from
the browser using the public anon key + Row Level Security.

This replaces the previous React/Express/tRPC app (`compliance-checker/` in
the repo) with something Pages can actually serve. That folder can stay
as-is for reference or be removed later; nothing here depends on it.

## 1. Configure

Edit `assets/config.js` and fill in:

```js
SUPABASE_URL: "https://xkqsecpsuynljckbnzsu.supabase.co",
SUPABASE_ANON_KEY: "<Project Settings → API → anon public key>",
```

The anon key is safe to ship in client code — it only works within the
RLS policies already defined in `supabase/migrations/20260812_compliance_checker_mvp.sql`.
Never put the service role key here.

Leave `AI_PROVIDER: "local"` until you're ready to wire up Gemini or Qwen.
In local mode, document extraction is entered manually through the UI (still
saved as structured JSON to `document_extractions`, in the same shape an OCR
provider would produce) and compliance findings come from the deterministic
engine in `assets/compliance-engine.js` — a straight port of the original
`server/compliance/rules.ts`. No AI key, no cost, works fully offline from
any provider.

## 2. Seed system document types (optional but recommended)

The schema doesn't ship system document types by default. Insert the
standard set once, e.g. from the Supabase SQL editor:

```sql
insert into public.document_types (name, description, is_system, required_by_default) values
  ('Passport', 'Photo page of a valid passport', true, true),
  ('Transcript', 'Academic transcript', true, true),
  ('IELTS', 'English language test certificate', true, false);
```

Custom types (like "Father Sponsorship Letter") don't need seeding — any
signed-in user can add their own from `document-types.html`, and they behave
identically to system types everywhere in the app, including accepting
multiple documents per type.

## 3. Deploy

Everything here is static. Point GitHub Pages (or any static host) at this
folder, or copy its contents into the repo root/subfolder your Pages
workflow already serves.

## Architecture

| File | Role |
|---|---|
| `assets/supabase-client.js` | Single Supabase client instance |
| `assets/auth.js` | Session guard, sign up/in/out |
| `assets/compliance-engine.js` | Deterministic 3-stage rules engine (local `ComplianceAIProvider`) |
| `assets/providers/compliance-ai.js` | Swaps local ↔ Gemini ↔ Qwen for finding generation |
| `assets/providers/document-ai.js` | Swaps manual-entry ↔ Gemini ↔ Qwen for OCR/extraction |
| `assets/providers/storage.js` | Wraps Supabase Storage (`StorageProvider`) |
| `assets/providers/google-workspace.js` | Disabled-by-default Drive/Apps Script archive stub |

Every provider is selected through a `get*Provider()` function, never
imported directly by a page — so replacing Supabase, Gemini, Qwen, or the
Apps Script archive later means writing one new file, not touching the UI.

## Known gaps vs. the full spec (left for a follow-up pass)

- `compliance_requirements` (per-programme required-document rules) isn't
  wired into the UI yet — `requiredDocumentTypes` currently comes from each
  document type's `required_by_default` flag only.
- Gemini/Qwen extraction and finding providers are interface stubs that
  throw a clear "not configured" error until keys are added — by design,
  per the cost-control requirement not to call paid services automatically.
- No retry/backoff queue UI yet for provider rate limits (relevant once a
  real AI provider is turned on).
