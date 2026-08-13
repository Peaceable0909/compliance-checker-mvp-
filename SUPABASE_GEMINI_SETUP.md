# Gemini OCR setup

The `gemini-ocr` Supabase Edge Function is deployed to the connected project with JWT verification enabled. The browser calls it only for PDF and image documents after upload; the Gemini key is never placed in `assets/config.js`.

## Required manual step

In the Supabase Dashboard, open **Project Settings → Edge Functions → Secrets** and add:

```text
GEMINI_API_KEY=your_google_ai_studio_api_key
```

The function already receives `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and the authenticated request context from Supabase. Do not add a service-role key to the browser or repository.

## Supported flow

The reviewer uploads a PDF or image under a selected document type. The application invokes `gemini-ocr`; the function verifies the user JWT, confirms that the document belongs to that user, downloads the private Storage object, submits it to Gemini 2.5 Flash with a structured extraction schema, and returns normalized fields for `document_extractions`. The application then runs the compliance engine over those fields.

## Provider behavior

PDFs and images use Gemini OCR when `GEMINI_API_KEY` exists. JSON, CSV, and text files continue to use the local parser for development. If the Gemini secret is missing or the Gemini request fails, the document remains in the application flow with an error notice and does not ask the reviewer to type extracted data.

## Deployment facts

The function name is `gemini-ocr`, JWT verification is enabled, and the active deployment is version 2. The frontend configuration contains only the public function name; no Gemini credential is committed.
