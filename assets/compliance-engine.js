// Deterministic three-stage compliance engine, ported line-for-line in spirit
// from the original server/compliance/rules.ts so behaviour stays identical
// whether it runs server-side (Node) or here, client-side, in local mode.
//
// This is the "local" ComplianceAIProvider implementation. Gemini/Qwen
// implementations live in providers/compliance-ai.js and can replace this
// call without touching any page that uses it (see providers/README.md).

// Small sync hash (FNV-1a) standing in for node:crypto's sha1, since this
// runs in the browser. Only used to make finding ids stable/reproducible.
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function findingId(applicationId, type, documentId = "application") {
  return fnv1a(`${applicationId}:${type}:${documentId}`);
}

function addFinding(findings, input, type, severity, description, evidence, options = {}) {
  findings.push({
    findingId: findingId(input.applicationId, type, options.documentId ?? options.relatedDocumentId),
    applicationId: input.applicationId,
    documentId: options.documentId ?? null,
    relatedDocumentId: options.relatedDocumentId ?? null,
    findingType: type,
    severity,
    state: "open",
    description,
    evidence,
    expectedValue: options.expectedValue ?? null,
    actualValue: options.actualValue ?? null,
    recommendation: options.recommendation ?? null,
    confidence: options.confidence ?? null,
  });
}

function same(left, right) {
  return Boolean(left && right && left.trim().toLowerCase() === right.trim().toLowerCase());
}

function fieldValue(documents, type, field) {
  const doc = documents.find((d) => d.selectedType.toLowerCase() === type.toLowerCase());
  return doc?.extraction?.[field];
}

export function evaluateCompliance(input) {
  const findings = [];
  const presentTypes = new Set(input.documents.map((d) => d.selectedType.toLowerCase()));

  // Stage 1: each document checked against its selected type + extraction quality.
  for (const document of input.documents) {
    const extraction = document.extraction;
    if (!extraction) {
      addFinding(
        findings, input, "missing_extraction", "warning",
        `${document.fileName} has not completed extraction.`,
        { fileName: document.fileName },
        { documentId: document.id, recommendation: "Retry document processing before making a final decision." }
      );
      continue;
    }
    if (extraction.readable === false) {
      addFinding(
        findings, input, "unreadable_document", "warning",
        `${document.fileName} could not be read reliably.`,
        { readable: false },
        { documentId: document.id, recommendation: "Request a clearer scan or image." }
      );
    }
    if (extraction.detectedDocumentType && !same(extraction.detectedDocumentType, document.selectedType)) {
      addFinding(
        findings, input, "document_type_mismatch", "critical",
        `${document.fileName} does not match the selected document type.`,
        { selectedType: document.selectedType, detectedType: extraction.detectedDocumentType },
        { documentId: document.id, expectedValue: document.selectedType, actualValue: extraction.detectedDocumentType, recommendation: "Correct the document type or upload the expected evidence." }
      );
    }
    if (extraction.complete === false) {
      addFinding(
        findings, input, "incomplete_document", "warning",
        `${document.fileName} appears incomplete.`,
        { complete: false },
        { documentId: document.id, recommendation: "Review the document and provide the missing pages or fields." }
      );
    }
    if (
      document.selectedType.toLowerCase() === "passport" &&
      extraction.expiryDate &&
      input.requirements?.requiredPassportExpiry &&
      extraction.expiryDate < input.requirements.requiredPassportExpiry
    ) {
      addFinding(
        findings, input, "passport_expired_or_insufficient", "critical",
        "Passport expiry does not meet the required validity date.",
        { expiryDate: extraction.expiryDate, requiredExpiry: input.requirements.requiredPassportExpiry },
        { documentId: document.id, expectedValue: input.requirements.requiredPassportExpiry, actualValue: extraction.expiryDate, recommendation: "Request a valid passport with sufficient remaining validity." }
      );
    }
  }

  // Stage 2: identity + application facts across documents.
  const passportName = fieldValue(input.documents, "passport", "fullName");
  const transcriptName = fieldValue(input.documents, "transcript", "fullName");
  if (passportName && transcriptName && !same(passportName, transcriptName)) {
    addFinding(
      findings, input, "name_mismatch", "warning",
      "The passport name does not match the academic transcript name.",
      { passportName, transcriptName },
      {
        documentId: input.documents.find((d) => d.selectedType.toLowerCase() === "passport")?.id,
        relatedDocumentId: input.documents.find((d) => d.selectedType.toLowerCase() === "transcript")?.id,
        expectedValue: passportName, actualValue: transcriptName,
        recommendation: "Verify the name variation against official supporting evidence.",
      }
    );
  }
  const passportDob = fieldValue(input.documents, "passport", "dateOfBirth");
  if (passportDob && input.application.dateOfBirth && passportDob !== input.application.dateOfBirth) {
    addFinding(
      findings, input, "date_of_birth_mismatch", "critical",
      "The passport date of birth does not match the application.",
      { passportDateOfBirth: passportDob, applicationDateOfBirth: input.application.dateOfBirth },
      {
        documentId: input.documents.find((d) => d.selectedType.toLowerCase() === "passport")?.id,
        expectedValue: input.application.dateOfBirth, actualValue: passportDob,
        recommendation: "Resolve the identity discrepancy before continuing.",
      }
    );
  }
  const passportNumber = fieldValue(input.documents, "passport", "passportNumber");
  if (passportNumber && input.application.passportNumber && passportNumber !== input.application.passportNumber) {
    addFinding(
      findings, input, "passport_number_mismatch", "critical",
      "The passport number does not match the application.",
      { documentPassportNumber: passportNumber, applicationPassportNumber: input.application.passportNumber },
      {
        documentId: input.documents.find((d) => d.selectedType.toLowerCase() === "passport")?.id,
        expectedValue: input.application.passportNumber, actualValue: passportNumber,
        recommendation: "Confirm the correct passport number and update the application.",
      }
    );
  }

  // Stage 3: application against configured country/university/programme requirements.
  for (const requiredType of input.requiredDocumentTypes) {
    if (!presentTypes.has(requiredType.toLowerCase())) {
      addFinding(
        findings, input, "missing_required_document", "critical",
        `Required document is missing: ${requiredType}.`,
        { requiredType },
        { expectedValue: requiredType, recommendation: `Upload a valid ${requiredType} document.` }
      );
    }
  }
  if (input.requirements?.universityRequiresIelts && !presentTypes.has("ielts")) {
    addFinding(
      findings, input, "missing_ielts", "critical",
      "The selected university requires IELTS evidence, but no IELTS document is present.",
      { universityRequiresIelts: true },
      { expectedValue: "IELTS", recommendation: "Upload the required IELTS certificate." }
    );
  }

  const failed = findings.filter((f) => f.severity === "critical").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  const passed = Math.max(input.documents.length - failed - warnings, 0);
  const missing = findings.filter((f) => f.findingType.startsWith("missing_")).length;
  const status = failed > 0 ? "red" : warnings > 0 ? "yellow" : "green";

  return { status, documentsChecked: input.documents.length, passed, warnings, failed, missing, findings };
}
