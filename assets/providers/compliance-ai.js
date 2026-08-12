// ComplianceAIProvider: turns (documents + extractions + requirements) into
// structured findings. Swappable per plan section 15/16 — callers only ever
// call `getComplianceProvider()`, never a vendor SDK directly.
import { evaluateCompliance } from "../compliance-engine.js";

const localProvider = {
  name: "local",
  async evaluate(input) {
    // Deterministic, free, no network call — always available.
    return evaluateCompliance(input);
  },
};

const geminiProvider = {
  name: "gemini",
  async evaluate() {
    throw new Error(
      "Gemini compliance provider is not configured. Add GEMINI_API_KEY in assets/config.js, " +
      "or leave AI_PROVIDER as \"local\" to keep using the deterministic engine at $0 cost."
    );
  },
};

const qwenProvider = {
  name: "qwen",
  async evaluate() {
    throw new Error(
      "Qwen compliance provider is not configured. Add QWEN_API_KEY / QWEN_API_BASE_URL in " +
      "assets/config.js, or leave AI_PROVIDER as \"local\"."
    );
  },
};

export function getComplianceProvider() {
  const provider = window.APP_CONFIG.AI_PROVIDER;
  if (provider === "gemini") return geminiProvider;
  if (provider === "qwen") return qwenProvider;
  return localProvider;
}
