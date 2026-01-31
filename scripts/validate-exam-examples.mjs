#!/usr/bin/env node

/**
 * Exam Package Example Validator
 *
 * This script validates that all example exam packages conform to the schema.
 * Run with: npm run validate:exams
 */

import { createRequire } from "module";

// We need to transpile TypeScript on the fly
const require = createRequire(import.meta.url);

async function main() {
  console.log("\n🔍 Validating Exam Package Examples...\n");

  // Dynamic import after tsx compilation
  const { validateExamPackage, validateMediaReferences, validateTotalMarks } =
    await import("../src/contracts/exam-package.schema.ts");
  const { year2NumeracyExam } = await import(
    "../src/contracts/examples/year2-numeracy.ts"
  );
  const { year5MathsExam } = await import(
    "../src/contracts/examples/year5-maths.ts"
  );
  const { year9ReadingExam } = await import(
    "../src/contracts/examples/year9-reading.ts"
  );

  const examples = [
    { name: "Year 2 Numeracy", exam: year2NumeracyExam },
    { name: "Year 5 Mathematics", exam: year5MathsExam },
    { name: "Year 9 Reading", exam: year9ReadingExam },
  ];

  let allValid = true;

  for (const { name, exam } of examples) {
    console.log(`📄 ${name}:`);

    // Schema validation
    const result = validateExamPackage(exam);
    if (!result.success) {
      console.log(`   ❌ Schema validation failed`);
      console.log(`   Errors:`, result.errors?.format());
      allValid = false;
      continue;
    }
    console.log(`   ✅ Schema validation passed`);

    // Media reference validation
    const mediaErrors = validateMediaReferences(exam);
    if (mediaErrors.length > 0) {
      console.log(`   ❌ Media reference validation failed`);
      mediaErrors.forEach((err) => console.log(`      - ${err}`));
      allValid = false;
    } else {
      console.log(`   ✅ Media references valid`);
    }

    // Total marks validation
    const marksValid = validateTotalMarks(exam);
    if (!marksValid) {
      console.log(`   ❌ Total marks mismatch`);
      allValid = false;
    } else {
      console.log(`   ✅ Total marks correct`);
    }

    console.log("");
  }

  if (allValid) {
    console.log("✅ All exam package examples are valid!\n");
    process.exit(0);
  } else {
    console.log("❌ Some validation errors found.\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Validation script error:", err);
  process.exit(1);
});
