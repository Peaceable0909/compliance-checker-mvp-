import assert from "node:assert/strict";
import { evaluateCompliance } from "./assets/compliance-engine.js";

const result = evaluateCompliance({
  applicationId: "app-1",
  application: { countryId: "country-1", universityId: null, programmeId: null },
  documents: [{ id: "doc-1", documentTypeId: "type-1", fileName: "passport.pdf", selectedType: "Passport", extraction: { fullName: "Jane Doe" } }],
  requiredDocumentTypes: [],
  requirements: {},
  rules: [{
    id: "rule-1",
    rule_key: "passport_number_required",
    name: "Passport number required",
    scope: "document_type",
    document_type_id: "type-1",
    severity: "critical",
    priority: 1,
    is_enabled: true,
    condition_config: { field: "required_field", operator: "missing", value: "passportNumber" },
    action_config: { message: "Passport number is missing.", recommendation: "Review the passport." },
  }],
});

assert.equal(result.status, "red");
assert.equal(result.findings[0].findingType, "passport_number_required");
assert.equal(result.findings[0].severity, "critical");
const advanced = evaluateCompliance({
  applicationId: "app-2",
  application: { countryId: "country-1", universityId: "uni-1", programmeId: "programme-1" },
  documents: [
    { id: "doc-transcript", documentTypeId: "transcript", fileName: "transcript.json", selectedType: "Transcript", extraction: { gpa: 2.4 } },
    { id: "doc-ielts", documentTypeId: "ielts", fileName: "ielts.json", selectedType: "IELTS", extraction: { ieltsOverall: 6.0, ieltsLowestBand: 5.5 } },
    { id: "doc-bank", documentTypeId: "bank", fileName: "bank.json", selectedType: "Bank Statement", extraction: { accountBalance: 8000, maintenancePeriodDays: 20 } },
  ],
  requiredDocumentTypes: [],
  requirements: {},
  rules: [
    { id: "gpa", rule_key: "gpa_minimum", name: "Minimum GPA", scope: "programme", programme_id: "programme-1", severity: "critical", priority: 1, is_enabled: true, condition_config: { field: "gpa_minimum", value: "3.0" }, action_config: { message: "GPA is below the programme minimum." } },
    { id: "ielts", rule_key: "ielts_minimum", name: "IELTS minimum", scope: "university", university_id: "uni-1", severity: "warning", priority: 2, is_enabled: true, condition_config: { field: "english_ielts_minimum", value: "6.5" }, action_config: { message: "IELTS score is below the requirement." } },
    { id: "funds", rule_key: "funds_minimum", name: "Financial balance", scope: "country", country_id: "country-1", severity: "critical", priority: 3, is_enabled: true, condition_config: { field: "financial_minimum_balance", value: "12000" }, action_config: { message: "Financial evidence is below the minimum balance." } },
  ],
});
assert.equal(advanced.findings.some((finding) => finding.findingType === "gpa_minimum"), true);
assert.equal(advanced.findings.some((finding) => finding.findingType === "ielts_minimum"), true);
assert.equal(advanced.findings.some((finding) => finding.findingType === "funds_minimum"), true);
console.log("rule engine smoke test passed");
