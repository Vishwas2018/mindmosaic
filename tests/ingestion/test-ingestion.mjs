/**
 * MindMosaic Ingestion Pipeline Test
 *
 * This script signs in as admin and tests the ingestion edge function.
 *
 * Usage: node tests/ingestion/test-ingestion.mjs
 */

import { createClient } from "@supabase/supabase-js";

// ============================================================================
// Configuration - UPDATE THESE VALUES
// ============================================================================

const SUPABASE_URL = "https://xwofhnonojnpfzclbbro.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3b2Zobm9ub2pucGZ6Y2xiYnJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5OTg1ODgsImV4cCI6MjA4NTU3NDU4OH0.1szTGN02_-oO-HpdXrbYgNrqey8d8Ro03tTI0vslsd4";

// Your admin user credentials
const ADMIN_EMAIL = "jvishu21@gmail.com";
const ADMIN_PASSWORD = "MindMosaic@123"; // <-- UPDATE THIS

// ============================================================================
// Test Data
// ============================================================================

const testPackage = {
  metadata: {
    id: crypto.randomUUID(),
    title: "Test Exam - Pipeline Verification",
    yearLevel: 3,
    subject: "mathematics",
    assessmentType: "naplan",
    durationMinutes: 30,
    totalMarks: 1,
    version: "1.0.0",
    schemaVersion: "1.0.0",
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    instructions: ["Test instruction"],
  },
  questions: [
    {
      id: crypto.randomUUID(),
      sequenceNumber: 1,
      difficulty: "easy",
      responseType: "mcq",
      marks: 1,
      promptBlocks: [{ type: "text", content: "What is 2 + 2?" }],
      options: [
        { id: "A", content: "3" },
        { id: "B", content: "4" },
        { id: "C", content: "5" },
        { id: "D", content: "6" },
      ],
      correctAnswer: { type: "mcq", correctOptionId: "B" },
      tags: ["addition", "test"],
    },
  ],
  mediaAssets: [],
};

// ============================================================================
// Main Test Function
// ============================================================================

async function runTest() {
  console.log("🚀 MindMosaic Ingestion Pipeline Test\n");
  console.log("=".repeat(60));

  // Step 1: Create Supabase client
  console.log("\n📦 Step 1: Creating Supabase client...");
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Step 2: Sign in as admin
  console.log("🔐 Step 2: Signing in as admin...");

  if (ADMIN_PASSWORD === "YOUR_PASSWORD_HERE") {
    console.error("\n❌ ERROR: Please update ADMIN_PASSWORD in the script!");
    process.exit(1);
  }

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

  if (authError) {
    console.error("\n❌ Sign-in failed:", authError.message);
    process.exit(1);
  }

  console.log("✅ Signed in successfully!");
  console.log("   User ID:", authData.user.id);
  console.log("   Email:", authData.user.email);

  const accessToken = authData.session.access_token;
  console.log(
    "   Token (first 50 chars):",
    accessToken.substring(0, 50) + "...",
  );

  // Step 3: Call the ingestion edge function
  console.log("\n📤 Step 3: Calling ingestion edge function...");
  console.log("   Package ID:", testPackage.metadata.id);
  console.log("   Title:", testPackage.metadata.title);

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/ingest-exam-package`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPackage),
    },
  );

  const result = await response.json();

  console.log("\n📋 Response:");
  console.log("   Status:", response.status);
  console.log("   Body:", JSON.stringify(result, null, 2));

  // Step 4: Interpret result
  console.log("\n" + "=".repeat(60));

  if (result.success) {
    console.log("✅ SUCCESS! Exam package ingested.");
    console.log("   Package ID:", result.examPackageId);
    console.log("\n📊 Verify in Supabase SQL Editor:");
    console.log("   SELECT * FROM exam_packages;");
    console.log("   SELECT * FROM exam_questions;");
    console.log("   SELECT * FROM exam_correct_answers;");
  } else {
    console.log("❌ FAILED:", result.error);

    if (result.schemaErrors) {
      console.log("\n🔍 Schema Errors:");
      result.schemaErrors.forEach((e, i) => {
        console.log(`   ${i + 1}. ${e.path}: ${e.message}`);
      });
    }

    if (result.businessErrors) {
      console.log("\n🔍 Business Errors:");
      result.businessErrors.forEach((e, i) => {
        console.log(`   ${i + 1}. ${e}`);
      });
    }

    if (result.message) {
      console.log("\n📝 Message:", result.message);
    }
  }

  // Sign out
  await supabase.auth.signOut();
  console.log("\n👋 Signed out.");
}

// Run the test
runTest().catch(console.error);
