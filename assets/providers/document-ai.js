// DocumentAIProvider: turns an uploaded file into structured extracted_data.
// The contract is intentionally provider-neutral: production OCR can replace this
// local adapter without changing the application workflow.

function normaliseText(text, documentType) {
  const data = { readable: true, complete: true, extractedDocumentType: documentType?.name || null, rawTextAvailable: true };
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (!match) continue;
    const key = match[1].trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const value = match[2].trim();
    if (["full_name", "name"].includes(key)) data.fullName = value;
    else if (["date_of_birth", "dob"].includes(key)) data.dateOfBirth = value;
    else if (["passport_number", "passport_no"].includes(key)) data.passportNumber = value;
    else if (["expiry_date", "passport_expiry", "passport_expiry_date"].includes(key)) data.expiryDate = value;
    else if (["gpa", "grade_point_average"].includes(key)) data.gpa = Number(value) || value;
    else if (["degree_classification", "classification"].includes(key)) data.degreeClassification = value;
    else if (["ielts_overall", "ielts"].includes(key)) data.ieltsOverall = Number(value) || value;
    else if (["ielts_min_band", "ielts_lowest_band"].includes(key)) data.ieltsLowestBand = Number(value) || value;
    else if (["toefl", "toefl_total"].includes(key)) data.toeflTotal = Number(value) || value;
    else if (["pte", "pte_total"].includes(key)) data.pteTotal = Number(value) || value;
    else if (["account_balance", "balance", "available_funds"].includes(key)) data.accountBalance = Number(value.replace(/[^0-9.-]/g, "")) || value;
    else if (["currency"].includes(key)) data.currency = value;
    else if (["statement_date", "bank_statement_date"].includes(key)) data.statementDate = value;
    else if (["maintenance_period_days", "financial_maintenance_days"].includes(key)) data.maintenancePeriodDays = Number(value) || value;
  }
  return data;
}

const localProvider = {
  name: "local",
  async extract({ file, documentType }) {
    if (!file) throw new Error("Automatic extraction requires the uploaded file.");
    const isText = file.type?.startsWith("text/") || /\.(json|csv|txt)$/i.test(file.name || "");
    if (isText && typeof file.text === "function") {
      const text = await file.text();
      let extracted = {};
      try { extracted = file.name.toLowerCase().endsWith(".json") ? JSON.parse(text) : normaliseText(text, documentType); }
      catch { extracted = normaliseText(text, documentType); }
      return { provider: "local", model: "text-parser", extracted_data: { ...extracted, extractionStatus: "complete" }, confidence: 0.72 };
    }
    return {
      provider: "local", model: "metadata-only", confidence: null,
      extracted_data: {
        readable: null, complete: null, extractedDocumentType: documentType?.name || null,
        extractionStatus: "provider_required", manualReviewRequired: true,
        message: "Automatic OCR is not configured for this file type."
      },
    };
  },
};

const geminiProvider = {
  name: "gemini",
  async extract() {
    throw new Error("Gemini document OCR requires a server-side provider endpoint; browser-side API keys are intentionally unsupported.");
  },
};

const qwenProvider = {
  name: "qwen",
  async extract() {
    throw new Error("Qwen document OCR requires a server-side provider endpoint; browser-side API keys are intentionally unsupported.");
  },
};

export function getDocumentAIProvider() {
  const provider = window.APP_CONFIG.AI_PROVIDER;
  if (provider === "gemini") return geminiProvider;
  if (provider === "qwen") return qwenProvider;
  return localProvider;
}
