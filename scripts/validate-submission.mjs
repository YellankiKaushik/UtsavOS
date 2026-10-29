import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
const source = JSON.parse(
  readFileSync("docs/hackathon/SUBMISSION_FORM_ANSWERS.json", "utf8"),
);
const fields = Object.entries(source.fields).map(([name, field]) => ({
  name,
  characters: field.value === null ? null : field.value.length,
  maxCharacters: field.maxCharacters ?? null,
  withinLimit:
    field.value === null ||
    !field.maxCharacters ||
    field.value.length <= field.maxCharacters,
  hasValue: typeof field.value === "string" && field.value.length > 0,
}));
const report = {
  draftTextValid: fields.every((f) => f.withinLimit),
  readyToSubmit: source.readyToSubmit,
  fields,
  missingPublishedLinks: fields.filter((f) => !f.hasValue).map((f) => f.name),
  note: "Text validation is not a submission or public-link/access/eligibility verification. No external form was submitted.",
};
mkdirSync(".runtime/release-20261029", { recursive: true });
writeFileSync(
  ".runtime/release-20261029/submission-validation.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
if (!report.draftTextValid) process.exitCode = 1;
if (
  process.argv.includes("--ready") &&
  (!source.readyToSubmit || report.missingPublishedLinks.length)
)
  process.exitCode = 2;
