// DocumentAIProvider: turns an uploaded file into extracted_data for
// document_extractions. Until an OCR provider key is added, extraction is
// entered manually (still written through the same structured shape), so
// the compliance engine never has to know the difference.
const localProvider = {
  name: "local",
  // Manual entry: the review UI collects the fields itself and calls this
  // just to normalise/validate shape before it's written to Supabase.
  async extract(manualFields) {
    return {
      provider: "local",
      model: "manual-entry",
      extracted_data: manualFields,
      confidence: manualFields.confidence ?? null,
    };
  },
};

const geminiProvider = {
  name: "gemini",
  async extract() {
    throw new Error("Gemini document OCR is not configured yet. Add GEMINI_API_KEY in assets/config.js.");
  },
};

const qwenProvider = {
  name: "qwen",
  async extract() {
    throw new Error("Qwen document OCR is not configured yet. Add QWEN_API_KEY / QWEN_API_BASE_URL in assets/config.js.");
  },
};

export function getDocumentAIProvider() {
  const provider = window.APP_CONFIG.AI_PROVIDER;
  if (provider === "gemini") return geminiProvider;
  if (provider === "qwen") return qwenProvider;
  return localProvider;
}
