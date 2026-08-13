import assert from "node:assert/strict";
import { evaluateCompliance } from "./assets/compliance-engine.js";

const nigeriaAlternative = evaluateCompliance({
  applicationId: "yorksj-nigeria-1",
  application: { programmeName: "bsc Nursing" },
  requiredDocumentTypes: ["Passport", "Academic Transcript", "Personal Statement", "Academic Reference", "CV"],
  requirements: {
    requiredDocumentAlternatives: [["WAEC Certificate", "NECO Certificate", "IELTS"]],
    englishEvidenceAlternatives: ["WAEC Certificate", "NECO Certificate", "IELTS"],
    minIeltsScore: 6.0,
    minEnglishComponentScore: 5.5,
  },
  documents: [
    { id: "passport", fileName: "passport.pdf", selectedType: "Passport", extraction: { fullName: "Jane Doe" } },
    { id: "transcript", fileName: "transcript.pdf", selectedType: "Academic Transcript", extraction: { fullName: "Jane Doe", gpa: 3.0 } },
    { id: "waec", fileName: "waec.pdf", selectedType: "WAEC Certificate", extraction: { englishGrade: "C6" } },
    { id: "personal", fileName: "personal.pdf", selectedType: "Personal Statement", extraction: { readable: true } },
    { id: "reference", fileName: "reference.pdf", selectedType: "Academic Reference", extraction: { readable: true } },
    { id: "cv", fileName: "cv.pdf", selectedType: "CV", extraction: { readable: true } },
  ],
  rules: [],
});

assert.equal(nigeriaAlternative.findings.some((finding) => finding.findingType === "missing_required_alternative_document"), false);
assert.equal(nigeriaAlternative.findings.some((finding) => finding.findingType === "minIeltsScore_missing"), false);
assert.equal(nigeriaAlternative.findings.some((finding) => finding.findingType === "minEnglishComponentScore_missing"), false);

const lowIelts = evaluateCompliance({
  applicationId: "yorksj-nigeria-2",
  application: { programmeName: "bsc Nursing" },
  requiredDocumentTypes: [],
  requirements: { minIeltsScore: 6.0, minEnglishComponentScore: 5.5 },
  documents: [{ id: "ielts", fileName: "ielts.pdf", selectedType: "IELTS", extraction: { ieltsOverall: 5.5, ieltsLowestBand: 5.0 } }],
  rules: [],
});
assert.equal(lowIelts.findings.some((finding) => finding.findingType === "minIeltsScore_below_minimum"), true);
assert.equal(lowIelts.findings.some((finding) => finding.findingType === "minEnglishComponentScore_below_minimum"), true);
console.log("York St John rule smoke test passed");
