#!/usr/bin/env node

/**
 * Exam Package Example Validator
 *
 * Validates example exam packages against the Zod contract.
 *
 * NOTE:
 * - This script relies on `tsx` to execute TypeScript imports.
 * - JSON Schema validation is handled separately in edge functions.
 *
 * Run with: npm run validate:exams
 */

async function main() {
  console.log("\n🔍 Validating Exam Package Examples...\n");

  let validateExamPackage;
  let validateMediaReferences;
  let validateTotalMarks;

  try {
    ({ validateExamPackage, validateMediaReferences, validateTotalMarks } =
      await import("../src/contracts/exam-package.schema.ts"));
  } catch (err) {
    console.error(
      "❌ Failed to load exam package schema. Ensure this script is run via tsx.",
    );
    throw err;
  }

  const { year2NumeracyExam } =
    await import("../src/contracts/examples/year2-numeracy.ts");
  const { year5MathsExam } =
    await import("../src/contracts/examples/year5-maths.ts");
  const { year9ReadingExam } =
    await import("../src/contracts/examples/year9-reading.ts");

  const examples = [
    { name: "Year 2 Numeracy", exam: year2NumeracyExam },
    { name: "Year 5 Mathematics", exam: year5MathsExam },
    { name: "Year 9 Reading", exam: year9ReadingExam },
  ];

  let allValid = true;

  for (const { name, exam } of examples) {
    console.log(`📄 ${name}:`);

    // 1. Schema validation
    const result = validateExamPackage(exam);
    if (!result.success) {
      console.log("   ❌ Schema validation failed");

      for (const issue of result.errors.issues) {
        console.log(
          `      - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
        );
      }

      allValid = false;
      console.log("");
      continue;
    }

    console.log("   ✅ Schema validation passed");

    // 2. Media reference validation
    const mediaErrors = validateMediaReferences(exam);
    if (mediaErrors.length > 0) {
      console.log("   ❌ Media reference validation failed");
      mediaErrors.forEach((err) => console.log(`      - ${err}`));
      allValid = false;
    } else {
      console.log("   ✅ Media references valid");
    }

    // 3. Total marks validation
    if (!validateTotalMarks(exam)) {
      console.log("   ❌ Total marks mismatch");
      allValid = false;
    } else {
      console.log("   ✅ Total marks correct");
    }

    console.log("");
  }

  if (allValid) {
    console.log("✅ All exam package examples are valid!\n");
    process.exit(0);
  } else {
    console.log("❌ Validation errors detected.\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Validation script error:", err);
  process.exit(1);
});
