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

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let previous = Array.from({ length: n + 1 }, (_, index) => index);
  for (let rowIndex = 1; rowIndex <= m; rowIndex++) {
    const row = [rowIndex];
    for (let columnIndex = 1; columnIndex <= n; columnIndex++) {
      row[columnIndex] = a[rowIndex - 1] === b[columnIndex - 1]
        ? previous[columnIndex - 1]
        : 1 + Math.min(previous[columnIndex - 1], previous[columnIndex], row[columnIndex - 1]);
    }
    previous = row;
  }
  return previous[n];
}

function nameSimilarity(nameA, nameB) {
  const tokensA = String(nameA).toUpperCase().replace(/[^A-Z\s]/g, " ").split(/\s+/).filter(Boolean);
  const tokensB = String(nameB).toUpperCase().replace(/[^A-Z\s]/g, " ").split(/\s+/).filter(Boolean);
  if (!tokensA.length || !tokensB.length) return 0;
  const used = new Set();
  let matched = 0;
  for (const tokenA of tokensA) {
    const index = tokensB.findIndex((tokenB, indexB) => {
      if (used.has(indexB)) return false;
      if (tokenA === tokenB) return true;
      if (tokenA.length <= 2 || tokenB.length <= 2) return false;
      return levenshtein(tokenA, tokenB) <= Math.max(1, Math.floor(Math.min(tokenA.length, tokenB.length) * 0.2));
    });
    if (index !== -1) { used.add(index); matched += 1; }
  }
  return matched / Math.max(tokensA.length, tokensB.length);
}

function fieldValue(documents, type, field) {
  const needle = type.toLowerCase();
  const doc = documents.find((d) => d.selectedType.toLowerCase().includes(needle));
  return doc?.extraction?.[field];
}

function activeRule(rule, today = new Date().toISOString().slice(0, 10)) {
  return rule?.is_enabled !== false && (!rule.effective_from || rule.effective_from <= today) && (!rule.effective_until || rule.effective_until >= today);
}

function ruleMatchesApplication(rule, input) {
  const app = input.application || {};
  if (rule.scope === "general") return true;
  if (rule.scope === "country") return rule.country_id && rule.country_id === app.countryId;
  if (rule.scope === "university") return rule.university_id && rule.university_id === app.universityId;
  if (rule.scope === "programme") return rule.programme_id && rule.programme_id === app.programmeId;
  if (rule.scope === "application") return rule.application_id && rule.application_id === input.applicationId;
  return true;
}

function configuredRuleSeverity(rule) {
  return rule.severity === "warning" || rule.severity === "info" ? rule.severity : "critical";
}

function numeric(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function matchingDocuments(rule, input) {
  if (rule.scope === "document_type") return input.documents.filter((doc) => doc.documentTypeId === rule.document_type_id);
  return input.documents;
}

function evaluateThresholdRule(findings, input, rule, field, label, options = {}) {
  const docs = matchingDocuments(rule, input);
  const values = docs.map((doc) => ({ doc, value: numeric(doc.extraction?.[field]) })).filter((item) => item.value !== null);
  const expected = numeric((rule.condition_config || rule.rule_config || {}).value);
  if (expected === null) return;
  if (!values.length) {
    addFinding(findings, input, `${rule.rule_key || field}_manual_review`, "warning", (rule.action_config || {}).message || `${label} could not be determined from the uploaded evidence.`, { ruleId: rule.id, ruleName: rule.name, expected, field, status: "missing_extraction" }, { recommendation: (rule.action_config || {}).recommendation || "Review the extracted evidence manually.", confidence: null });
    return;
  }
  const comparison = options.mode === "minimum" ? values.some(({ value }) => value >= expected) : values.some(({ value }) => value <= expected);
  if (!comparison) {
    const actual = values[0].value;
    addFinding(findings, input, rule.rule_key || field, configuredRuleSeverity(rule), (rule.action_config || {}).message || `${label} does not meet the configured requirement.`, { ruleId: rule.id, ruleName: rule.name, expected, actual, field, documents: values.map(({ doc }) => doc.fileName) }, { expectedValue: String(expected), actualValue: String(actual), recommendation: (rule.action_config || {}).recommendation || null, confidence: values[0].doc.extraction?.confidence ?? null });
  }
}

function evaluateAdvancedRules(findings, input, rule) {
  const field = (rule.condition_config || rule.rule_config || {}).field;
  if (field === "gpa_minimum") return evaluateThresholdRule(findings, input, rule, "gpa", "GPA", { mode: "minimum" });
  if (field === "english_ielts_minimum") return evaluateThresholdRule(findings, input, rule, "ieltsOverall", "IELTS overall score", { mode: "minimum" });
  if (field === "english_band_minimum") return evaluateThresholdRule(findings, input, rule, "ieltsLowestBand", "IELTS minimum band", { mode: "minimum" });
  if (field === "english_toefl_minimum") return evaluateThresholdRule(findings, input, rule, "toeflTotal", "TOEFL score", { mode: "minimum" });
  if (field === "english_pte_minimum") return evaluateThresholdRule(findings, input, rule, "pteTotal", "PTE score", { mode: "minimum" });
  if (field === "financial_minimum_balance") return evaluateThresholdRule(findings, input, rule, "accountBalance", "Financial balance", { mode: "minimum" });
  if (field === "financial_maintenance_period") return evaluateThresholdRule(findings, input, rule, "maintenancePeriodDays", "Financial maintenance period", { mode: "minimum" });
}

function evaluateMergedRequirements(findings, input) {
  const requirements = input.requirements || {};
  const docsByType = (needle) => input.documents.filter((doc) => doc.selectedType.toLowerCase().includes(needle));
  const threshold = (key, label, extractionField, documentNeedle) => {
    const expected = numeric(requirements[key]);
    if (expected === null) return;
    const docs = docsByType(documentNeedle);
    const values = docs.map((doc) => ({ doc, value: numeric(doc.extraction?.[extractionField]) })).filter((item) => item.value !== null);
    if (!values.length) {
      addFinding(findings, input, `${key}_missing`, "critical", `The application requires ${label}, but no usable ${label} result was extracted.`, { expected, field: extractionField }, { expectedValue: String(expected), recommendation: `Upload a valid ${label} document and allow automatic extraction to complete.` });
      return;
    }
    if (!values.some(({ value }) => value >= expected)) {
      addFinding(findings, input, `${key}_below_minimum`, "critical", `The extracted ${label} does not meet the minimum requirement of ${expected}.`, { expected, actual: values[0].value, field: extractionField }, { documentId: values[0].doc.id, expectedValue: String(expected), actualValue: String(values[0].value), recommendation: `Confirm the ${label} requirement and provide stronger evidence if needed.` });
    }
  };
  threshold("minIeltsScore", "IELTS overall score", "ieltsOverall", "ielts");
  threshold("minGpa", "GPA", "gpa", "transcript");
}

function evaluateConfiguredRules(findings, input) {
  for (const rule of (input.rules || []).filter(activeRule).sort((a, b) => (a.priority || 100) - (b.priority || 100))) {
    if (!ruleMatchesApplication(rule, input)) continue;
    const condition = rule.condition_config || rule.rule_config || {};
    const action = rule.action_config || {};
    const severity = configuredRuleSeverity(rule);
    const targetDocuments = rule.scope === "document_type"
      ? input.documents.filter((doc) => doc.documentTypeId === rule.document_type_id)
      : input.documents;

    if (["gpa_minimum", "english_ielts_minimum", "english_band_minimum", "english_toefl_minimum", "english_pte_minimum", "financial_minimum_balance", "financial_maintenance_period"].includes(condition.field)) {
      evaluateAdvancedRules(findings, input, rule);
    } else if (condition.field === "required_field" && condition.operator === "missing") {
      for (const document of targetDocuments) {
        if (!document.extraction || !condition.value || !document.extraction[condition.value]) {
          addFinding(findings, input, rule.rule_key || "configured_required_field", severity, action.message || `${rule.name} was not satisfied.`, { ruleId: rule.id, ruleName: rule.name, field: condition.value, fileName: document.fileName }, { documentId: document.id, expectedValue: condition.value, recommendation: action.recommendation || null, confidence: 1 });
        }
      }
    } else if (condition.field === "expiry_check" && condition.value) {
      for (const document of targetDocuments) {
        const expiryDate = document.extraction?.expiryDate;
        if (expiryDate && expiryDate < condition.value) {
          addFinding(findings, input, rule.rule_key || "configured_expiry_check", severity, action.message || `${document.fileName} does not meet the expiry requirement.`, { ruleId: rule.id, ruleName: rule.name, expiryDate, requiredDate: condition.value }, { documentId: document.id, expectedValue: condition.value, actualValue: expiryDate, recommendation: action.recommendation || null, confidence: 1 });
        }
      }
    } else if (condition.field === "human_review") {
      addFinding(findings, input, rule.rule_key || "configured_human_review", "warning", action.message || `${rule.name} requires human review.`, { ruleId: rule.id, ruleName: rule.name, condition }, { recommendation: action.recommendation || "Review this rule manually.", confidence: null });
    }
  }
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
      document.selectedType.toLowerCase().includes("passport") &&
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
  if (passportName && transcriptName) {
    const similarity = nameSimilarity(passportName, transcriptName);
    if (similarity < 1) {
      const critical = similarity < 0.6;
      addFinding(
        findings, input, "name_mismatch", critical ? "critical" : "warning",
        critical
          ? "The passport name does not match the academic transcript name."
          : "The passport and transcript names appear to refer to the same person but have a minor variation.",
        { passportName, transcriptName, similarity: Math.round(similarity * 100) / 100 },
        {
          documentId: input.documents.find((d) => d.selectedType.toLowerCase().includes("passport"))?.id,
          relatedDocumentId: input.documents.find((d) => d.selectedType.toLowerCase().includes("transcript"))?.id,
          expectedValue: passportName, actualValue: transcriptName,
          confidence: Math.round(similarity * 100) / 100,
          recommendation: critical
            ? "Verify the name variation against official supporting evidence."
            : "Likely the same person with reordered or lightly misspelled name — confirm and proceed.",
        }
      );
    }
  }
  const passportDob = fieldValue(input.documents, "passport", "dateOfBirth");
  if (passportDob && input.application.dateOfBirth && passportDob !== input.application.dateOfBirth) {
    addFinding(
      findings, input, "date_of_birth_mismatch", "critical",
      "The passport date of birth does not match the application.",
      { passportDateOfBirth: passportDob, applicationDateOfBirth: input.application.dateOfBirth },
      {
        documentId: input.documents.find((d) => d.selectedType.toLowerCase().includes("passport"))?.id,
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
        documentId: input.documents.find((d) => d.selectedType.toLowerCase().includes("passport"))?.id,
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
  if (input.requirements?.universityRequiresIelts && ![...presentTypes].some((type) => type.includes("ielts"))) {
    addFinding(
      findings, input, "missing_ielts", "critical",
      "The selected institution or programme requires IELTS evidence, but no IELTS document is present.",
      { universityRequiresIelts: true },
      { expectedValue: "IELTS", recommendation: "Upload the required IELTS certificate." }
    );
  }
  evaluateMergedRequirements(findings, input);

  const priorField = fieldValue(input.documents, "transcript", "fieldOfStudy") || fieldValue(input.documents, "cv", "fieldOfStudy");
  const targetProgramme = input.application?.programmeName;
  if (priorField && targetProgramme) {
    const stop = new Set(["of", "and", "in", "the", "a", "for", "with", "bsc", "msc", "ba", "ma", "degree", "hnd"]);
    const words = (value) => new Set(String(value).toLowerCase().split(/[^a-z]+/).filter((word) => word.length > 2 && !stop.has(word)));
    const previousWords = words(priorField);
    const targetWords = words(targetProgramme);
    if (![...previousWords].some((word) => targetWords.has(word))) {
      addFinding(
        findings, input, "programme_relevance_review", "warning",
        `The applicant's prior field of study ("${priorField}") does not clearly relate to the target programme ("${targetProgramme}").`,
        { priorField, targetProgramme },
        { expectedValue: targetProgramme, actualValue: priorField, recommendation: "Confirm the progression rationale using the personal statement or academic reference." }
      );
    }
  }

  evaluateConfiguredRules(findings, input);

  const failed = findings.filter((f) => f.severity === "critical").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  const passed = Math.max(input.documents.length - failed - warnings, 0);
  const missing = findings.filter((f) => f.findingType.startsWith("missing_")).length;
  const status = failed > 0 ? "red" : warnings > 0 ? "yellow" : "green";
  const score = Math.max(0, Math.round(100 - failed * 15 - warnings * 5));
  const narrative = buildNarrative(input, findings, { score, status });

  return { status, score, documentsChecked: input.documents.length, passed, warnings, failed, missing, findings, narrative };
}

export function buildNarrative(input, findings, { score = 100, status = "green" } = {}) {
  const byDoc = new Map();
  for (const finding of findings) {
    if (!finding.documentId) continue;
    if (!byDoc.has(finding.documentId)) byDoc.set(finding.documentId, []);
    byDoc.get(finding.documentId).push(finding);
  }

  const documentSummaries = input.documents.map((doc) => {
    const docFindings = byDoc.get(doc.id) || [];
    const critical = docFindings.filter((finding) => finding.severity === "critical");
    const warnings = docFindings.filter((finding) => finding.severity === "warning");
    let line;
    if (!doc.extraction) line = "Uploaded, but not yet processed — this document cannot be fully checked yet.";
    else if (critical.length) line = critical.map((finding) => finding.description).join(" ");
    else if (warnings.length) line = warnings.map((finding) => finding.description).join(" ");
    else line = `Looks consistent with a ${doc.selectedType} and matches the rest of the application. No issues found.`;
    return { fileName: doc.fileName, selectedType: doc.selectedType, status: critical.length ? "red" : warnings.length || !doc.extraction ? "yellow" : "green", line };
  });

  const crossTypes = new Set(["name_mismatch", "date_of_birth_mismatch", "passport_number_mismatch"]);
  const crossFindings = findings.filter((finding) => crossTypes.has(finding.findingType));
  const crossDocumentSummary = crossFindings.length
    ? crossFindings.map((finding) => finding.description).join(" ")
    : input.documents.length > 1
      ? "Identity details line up consistently across the documents provided."
      : "Not enough documents have been uploaded to cross-check identity details against each other.";

  const seen = new Set();
  const observations = [];
  for (const finding of [...findings].sort((a, b) => (a.severity === "critical" ? -1 : b.severity === "critical" ? 1 : 0))) {
    if (seen.has(finding.description)) continue;
    seen.add(finding.description);
    observations.push({ severity: finding.severity, text: finding.description, recommendation: finding.recommendation || null });
  }
  if (!observations.length) observations.push({ severity: "info", text: "All uploaded documents are consistent with the application and no compliance issues were found.", recommendation: null });

  const grade = score >= 90 ? "Excellent" : score >= 70 ? "Needs review" : score >= 40 ? "Significant issues" : "Critical issues";
  return { score, status, grade, documentSummaries, crossDocumentSummary, observations };
}
