import assert from "node:assert/strict";
import { evaluateCompliance } from "./assets/compliance-engine.js";

const result = evaluateCompliance({
  applicationId: "entity-app",
  application: { programmeName: "Accounting MSc", dateOfBirth: null, passportNumber: null },
  requiredDocumentTypes: ["Passport", "IELTS", "Academic Transcript"],
  requirements: {
    minIeltsScore: 6.5,
    minGpa: 3.0,
    requiredPassportExpiry: "2027-01-01",
    universityRequiresIelts: true,
  },
  documents: [
    { id: "passport", fileName: "passport.pdf", selectedType: "Passport Bio Page", extraction: { fullName: "DOE JANE", expiryDate: "2026-01-01" } },
    { id: "ielts", fileName: "ielts.pdf", selectedType: "IELTS Academic", extraction: { ieltsOverall: 6.0 } },
    { id: "transcript", fileName: "transcript.pdf", selectedType: "University Transcript", extraction: { fullName: "Jane Doe", gpa: 2.8, fieldOfStudy: "Petroleum Engineering" } },
  ],
  rules: [],
});

assert.equal(result.findings.some((finding) => finding.findingType === "passport_expired_or_insufficient"), true);
assert.equal(result.findings.some((finding) => finding.findingType === "minIeltsScore_below_minimum"), true);
assert.equal(result.findings.some((finding) => finding.findingType === "minGpa_below_minimum"), true);
assert.equal(result.findings.some((finding) => finding.findingType === "programme_relevance_review"), true);
assert.equal(result.narrative.grade, "Critical issues");
console.log("entity requirements smoke test passed");
