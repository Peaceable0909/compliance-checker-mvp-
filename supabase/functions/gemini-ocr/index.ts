import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const extractionSchema = {
  type: "object",
  properties: {
    fullName: { type: "string" },
    dateOfBirth: { type: "string" },
    passportNumber: { type: "string" },
    expiryDate: { type: "string" },
    degreeClassification: { type: "string" },
    gpa: { type: "number" },
    institutionName: { type: "string" },
    programmeName: { type: "string" },
    ieltsOverall: { type: "number" },
    ieltsLowestBand: { type: "number" },
    toeflTotal: { type: "number" },
    pteTotal: { type: "number" },
    accountBalance: { type: "number" },
    currency: { type: "string" },
    statementDate: { type: "string" },
    maintenancePeriodDays: { type: "number" },
    readable: { type: "boolean" },
    complete: { type: "boolean" },
    extractedDocumentType: { type: "string" },
    extractionStatus: { type: "string", enum: ["complete", "partial", "unreadable"] },
    missingFields: { type: "array", items: { type: "string" } },
    notes: { type: "string" },
  },
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mimeAllowed(mime: string) {
  return mime === "application/pdf" || mime.startsWith("image/");
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Only POST is supported." }, 405);

  const authorization = request.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!authorization || !supabaseUrl || !anonKey || !geminiKey) return json({ error: "OCR service is not configured." }, 500);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "Unauthorized." }, 401);

  let payload: { document_id?: string; storage_bucket?: string; storage_path?: string; document_type?: string };
  try { payload = await request.json(); } catch { return json({ error: "Request body must be JSON." }, 400); }
  if (!payload.document_id) return json({ error: "document_id is required." }, 400);

  const { data: document, error: documentError } = await userClient
    .from("documents")
    .select("id, owner_id, file_name, mime_type, storage_bucket, storage_path, detected_document_type")
    .eq("id", payload.document_id)
    .eq("owner_id", user.id)
    .single();
  if (documentError || !document) return json({ error: "Document not found or not owned by the current user." }, 404);

  const mimeType = document.mime_type || "application/octet-stream";
  if (!mimeAllowed(mimeType)) return json({ error: "Gemini OCR currently supports PDF and image documents only." }, 415);
  const bucket = document.storage_bucket || payload.storage_bucket;
  if (!bucket || !document.storage_path) return json({ error: "Document storage metadata is incomplete." }, 422);

  const { data: file, error: downloadError } = await userClient.storage.from(bucket).download(document.storage_path);
  if (downloadError || !file) return json({ error: `Could not download document: ${downloadError?.message || "unknown storage error"}` }, 502);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const base64 = bytesToBase64(bytes);
  const documentType = payload.document_type || document.detected_document_type || "the selected document type";

  const prompt = `You are extracting compliance evidence from a ${documentType}. Return only JSON matching the schema. Do not guess. Use empty or omitted fields when the value is not clearly visible. Normalize dates to YYYY-MM-DD where possible. Extract GPA, degree classification, IELTS overall and lowest band, TOEFL total, PTE total, bank balance, currency, statement date, and financial maintenance period when present. Set extractionStatus to complete only when the page is readable and the relevant evidence is clear; otherwise use partial or unreadable. missingFields must list important values that were expected but not found.`;
  const geminiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: mimeType, data: base64 } }, { text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: extractionSchema, temperature: 0 },
    }),
  });
  if (!geminiResponse.ok) return json({ error: `Gemini OCR failed: ${await geminiResponse.text()}` }, 502);
  const gemini = await geminiResponse.json();
  const text = gemini.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || "";
  if (!text) return json({ error: "Gemini returned no structured extraction." }, 502);
  let extractedData: Record<string, unknown>;
  try { extractedData = JSON.parse(text); } catch { return json({ error: "Gemini returned invalid JSON." }, 502); }

  return json({ provider: "gemini", model: "gemini-2.5-flash", extracted_data: { ...extractedData, extractedDocumentType: extractedData.extractedDocumentType || documentType }, confidence: null });
});
