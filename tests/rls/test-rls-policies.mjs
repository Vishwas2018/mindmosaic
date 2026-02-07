/**
 * MindMosaic Day 11: RLS Verification Tests
 *
 * This script tests Row Level Security policies by attempting
 * various operations as different user roles.
 *
 * Prerequisites:
 *   1. Test users created in Supabase Auth
 *   2. Profiles entries added for each user
 *   3. At least one published exam package exists
 *
 * Usage: node tests/rls/test-rls-policies.mjs
 */

import { createClient } from "@supabase/supabase-js";

// =============================================================================
// Configuration - UPDATE THESE VALUES
// =============================================================================

const SUPABASE_URL = "https://xwofhnonojnpfzclbbro.supabase.co";
const SUPABASE_ANON_KEY =
  " eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3b2Zobm9ub2pucGZ6Y2xiYnJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5OTg1ODgsImV4cCI6MjA4NTU3NDU4OH0.1szTGN02_-oO-HpdXrbYgNrqey8d8Ro03tTI0vslsd4"; // <-- UPDATE THIS

// Test user credentials - UPDATE THESE after creating users
const TEST_USERS = {
  admin: {
    email: "jvishu21@gmail.com",
    password: "MindMosaic@123", // <-- UPDATE THIS
    expectedRole: "admin",
  },
  student: {
    email: "student@test.com",
    password: "TestStudent123!", // <-- UPDATE if different
    expectedRole: "student",
  },
  parent: {
    email: "parent@test.com",
    password: "TestParent123!", // <-- UPDATE if different
    expectedRole: "parent",
  },
};

// Test exam package ID (the one we created earlier)
const TEST_PACKAGE_ID = "11111111-1111-1111-1111-111111111111";
const TEST_QUESTION_ID = "22222222-2222-2222-2222-222222222222";

// =============================================================================
// Test Results Tracking
// =============================================================================

const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
};

function recordTest(name, passed, details = "") {
  results.tests.push({ name, passed, details });
  if (passed === true) results.passed++;
  else if (passed === false) results.failed++;
  else results.skipped++;

  const icon = passed === true ? "✅" : passed === false ? "❌" : "⏭️";
  console.log(`   ${icon} ${name}${details ? ` - ${details}` : ""}`);
}

// =============================================================================
// Helper Functions
// =============================================================================

async function createAuthenticatedClient(user) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });

  if (error) {
    throw new Error(`Failed to sign in as ${user.email}: ${error.message}`);
  }

  return { supabase, user: data.user, session: data.session };
}

async function signOut(supabase) {
  await supabase.auth.signOut();
}

// =============================================================================
// Test Suites
// =============================================================================

async function testAdminAccess() {
  console.log("\n📋 ADMIN ACCESS TESTS");
  console.log("─".repeat(50));

  let client;
  try {
    client = await createAuthenticatedClient(TEST_USERS.admin);
    console.log(`   Signed in as: ${client.user.email}`);
  } catch (e) {
    console.log(`   ❌ Could not sign in as admin: ${e.message}`);
    recordTest("Admin sign-in", false, e.message);
    return;
  }

  const { supabase } = client;

  // Test 1: Admin can read all exam packages (including drafts)
  {
    const { data, error } = await supabase
      .from("exam_packages")
      .select("id, title, status");

    recordTest(
      "Admin can read exam_packages",
      !error && data.length > 0,
      error ? error.message : `Found ${data.length} packages`,
    );
  }

  // Test 2: Admin can read exam_correct_answers
  {
    const { data, error } = await supabase
      .from("exam_correct_answers")
      .select("question_id, answer_type, correct_option_id");

    recordTest(
      "Admin can read exam_correct_answers",
      !error && data.length > 0,
      error ? error.message : `Found ${data.length} answers`,
    );
  }

  // Test 3: Admin can read exam_questions
  {
    const { data, error } = await supabase
      .from("exam_questions")
      .select("id, sequence_number, response_type");

    recordTest(
      "Admin can read exam_questions",
      !error && data.length > 0,
      error ? error.message : `Found ${data.length} questions`,
    );
  }

  // Test 4: Admin can read exam_question_options
  {
    const { data, error } = await supabase
      .from("exam_question_options")
      .select("question_id, option_id, content");

    recordTest(
      "Admin can read exam_question_options",
      !error && data.length > 0,
      error ? error.message : `Found ${data.length} options`,
    );
  }

  // Test 5: Admin can read all exam_attempts
  {
    const { data, error } = await supabase
      .from("exam_attempts")
      .select("id, student_id, status");

    recordTest(
      "Admin can read exam_attempts",
      !error,
      error ? error.message : `Found ${data.length} attempts`,
    );
  }

  // Test 6: Admin can read all exam_responses
  {
    const { data, error } = await supabase
      .from("exam_responses")
      .select("id, attempt_id, question_id");

    recordTest(
      "Admin can read exam_responses",
      !error,
      error ? error.message : `Found ${data.length} responses`,
    );
  }

  await signOut(supabase);
}

async function testStudentAccess() {
  console.log("\n📋 STUDENT ACCESS TESTS");
  console.log("─".repeat(50));

  let client;
  try {
    client = await createAuthenticatedClient(TEST_USERS.student);
    console.log(`   Signed in as: ${client.user.email}`);
  } catch (e) {
    console.log(`   ⏭️ Skipping student tests: ${e.message}`);
    console.log(`   → Create student@test.com in Supabase Auth first`);
    recordTest("Student sign-in", null, "User not created yet");
    return;
  }

  const { supabase, user } = client;

  // Test 1: Student can read PUBLISHED exam packages
  {
    const { data, error } = await supabase
      .from("exam_packages")
      .select("id, title, status")
      .eq("status", "published");

    recordTest(
      "Student can read published exam_packages",
      !error && data.length > 0,
      error ? error.message : `Found ${data.length} published packages`,
    );
  }

  // Test 2: Student CANNOT read draft packages
  {
    const { data, error } = await supabase
      .from("exam_packages")
      .select("id, title, status")
      .eq("status", "draft");

    recordTest(
      "Student CANNOT read draft exam_packages",
      !error && data.length === 0,
      error ? error.message : `Found ${data.length} drafts (should be 0)`,
    );
  }

  // Test 3: Student CANNOT read exam_correct_answers (CRITICAL)
  {
    const { data, error } = await supabase
      .from("exam_correct_answers")
      .select("*");

    recordTest(
      "Student CANNOT read exam_correct_answers ⚠️",
      !error && data.length === 0,
      error ? error.message : `Found ${data.length} answers (should be 0)`,
    );
  }

  // Test 4: Student can read questions for published packages
  {
    const { data, error } = await supabase
      .from("exam_questions")
      .select("id, sequence_number, response_type, exam_package_id");

    recordTest(
      "Student can read exam_questions (published)",
      !error && data.length > 0,
      error ? error.message : `Found ${data.length} questions`,
    );
  }

  // Test 5: Student can read question options
  {
    const { data, error } = await supabase
      .from("exam_question_options")
      .select("question_id, option_id, content");

    recordTest(
      "Student can read exam_question_options",
      !error && data.length > 0,
      error ? error.message : `Found ${data.length} options`,
    );
  }

  // Test 6: Student can create an exam attempt
  const attemptId = crypto.randomUUID();
  {
    const { data, error } = await supabase
      .from("exam_attempts")
      .insert({
        id: attemptId,
        exam_package_id: TEST_PACKAGE_ID,
        student_id: user.id,
        status: "started",
      })
      .select();

    recordTest(
      "Student can create own exam_attempt",
      !error && data.length === 1,
      error ? error.message : `Created attempt ${attemptId.substring(0, 8)}...`,
    );
  }

  // Test 7: Student can read own attempts
  {
    const { data, error } = await supabase
      .from("exam_attempts")
      .select("id, status, student_id")
      .eq("student_id", user.id);

    recordTest(
      "Student can read own exam_attempts",
      !error && data.length > 0,
      error ? error.message : `Found ${data.length} own attempts`,
    );
  }

  // Test 8: Student can submit a response
  const responseId = crypto.randomUUID();
  {
    const { data, error } = await supabase
      .from("exam_responses")
      .insert({
        id: responseId,
        attempt_id: attemptId,
        question_id: TEST_QUESTION_ID,
        response_type: "mcq",
        response_data: { selectedOptionId: "B" },
      })
      .select();

    recordTest(
      "Student can insert own exam_response",
      !error && data.length === 1,
      error ? error.message : `Created response`,
    );
  }

  // Test 9: Student can read own responses
  {
    const { data, error } = await supabase
      .from("exam_responses")
      .select("id, question_id, response_data");

    recordTest(
      "Student can read own exam_responses",
      !error && data.length > 0,
      error ? error.message : `Found ${data.length} own responses`,
    );
  }

  // Test 10: Student CANNOT insert into content tables
  {
    const { error } = await supabase.from("exam_packages").insert({
      id: crypto.randomUUID(),
      title: "Hacked Package",
      year_level: 1,
      subject: "mathematics",
      assessment_type: "naplan",
      duration_minutes: 30,
      total_marks: 1,
      version: "1.0.0",
      schema_version: "1.0.0",
      status: "draft",
    });

    recordTest(
      "Student CANNOT insert exam_packages",
      error !== null,
      error ? "Blocked (correct)" : "Insert succeeded (SECURITY ISSUE!)",
    );
  }

  // Test 11: Student CANNOT delete attempts
  {
    const { error } = await supabase
      .from("exam_attempts")
      .delete()
      .eq("id", attemptId);

    // Note: Supabase may not return an error but will delete 0 rows
    const { data: checkData } = await supabase
      .from("exam_attempts")
      .select("id")
      .eq("id", attemptId);

    recordTest(
      "Student CANNOT delete exam_attempts",
      checkData && checkData.length > 0,
      checkData?.length > 0
        ? "Attempt still exists (correct)"
        : "Attempt deleted (SECURITY ISSUE!)",
    );
  }

  await signOut(supabase);
}

async function testParentAccess() {
  console.log("\n📋 PARENT ACCESS TESTS");
  console.log("─".repeat(50));

  let client;
  try {
    client = await createAuthenticatedClient(TEST_USERS.parent);
    console.log(`   Signed in as: ${client.user.email}`);
  } catch (e) {
    console.log(`   ⏭️ Skipping parent tests: ${e.message}`);
    console.log(`   → Create parent@test.com in Supabase Auth first`);
    recordTest("Parent sign-in", null, "User not created yet");
    return;
  }

  const { supabase } = client;

  // Test 1: Parent can read published exam packages
  {
    const { data, error } = await supabase
      .from("exam_packages")
      .select("id, title, status")
      .eq("status", "published");

    recordTest(
      "Parent can read published exam_packages",
      !error && data.length > 0,
      error ? error.message : `Found ${data.length} published packages`,
    );
  }

  // Test 2: Parent CANNOT read exam_correct_answers
  {
    const { data, error } = await supabase
      .from("exam_correct_answers")
      .select("*");

    recordTest(
      "Parent CANNOT read exam_correct_answers ⚠️",
      !error && data.length === 0,
      error ? error.message : `Found ${data.length} answers (should be 0)`,
    );
  }

  // Test 3: Parent CANNOT read exam_attempts (not linked yet)
  {
    const { data, error } = await supabase.from("exam_attempts").select("*");

    recordTest(
      "Parent CANNOT read exam_attempts (no linking yet)",
      !error && data.length === 0,
      error ? error.message : `Found ${data.length} attempts (should be 0)`,
    );
  }

  // Test 4: Parent CANNOT read exam_responses
  {
    const { data, error } = await supabase.from("exam_responses").select("*");

    recordTest(
      "Parent CANNOT read exam_responses",
      !error && data.length === 0,
      error ? error.message : `Found ${data.length} responses (should be 0)`,
    );
  }

  // Test 5: Parent CANNOT create attempts
  {
    const { error } = await supabase.from("exam_attempts").insert({
      id: crypto.randomUUID(),
      exam_package_id: TEST_PACKAGE_ID,
      student_id: crypto.randomUUID(),
      status: "started",
    });

    recordTest(
      "Parent CANNOT create exam_attempts",
      error !== null,
      error ? "Blocked (correct)" : "Insert succeeded (SECURITY ISSUE!)",
    );
  }

  await signOut(supabase);
}

async function testAnonymousAccess() {
  console.log("\n📋 ANONYMOUS ACCESS TESTS");
  console.log("─".repeat(50));

  // Create unauthenticated client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log("   Testing without authentication...");

  // Test 1: Anonymous CANNOT read exam_packages
  {
    const { data, error } = await supabase.from("exam_packages").select("*");

    recordTest(
      "Anonymous CANNOT read exam_packages",
      !error && data.length === 0,
      error ? error.message : `Found ${data.length} packages (should be 0)`,
    );
  }

  // Test 2: Anonymous CANNOT read exam_questions
  {
    const { data, error } = await supabase.from("exam_questions").select("*");

    recordTest(
      "Anonymous CANNOT read exam_questions",
      !error && data.length === 0,
      error ? error.message : `Found ${data.length} questions (should be 0)`,
    );
  }

  // Test 3: Anonymous CANNOT read exam_correct_answers
  {
    const { data, error } = await supabase
      .from("exam_correct_answers")
      .select("*");

    recordTest(
      "Anonymous CANNOT read exam_correct_answers",
      !error && data.length === 0,
      error ? error.message : `Found ${data.length} answers (should be 0)`,
    );
  }
}

// =============================================================================
// Main Test Runner
// =============================================================================

async function runAllTests() {
  console.log("🔐 MindMosaic RLS Verification Tests");
  console.log("=".repeat(60));
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🔗 ${SUPABASE_URL}`);

  // Check configuration
  if (SUPABASE_ANON_KEY === "YOUR_ANON_KEY_HERE") {
    console.error("\n❌ ERROR: Please update SUPABASE_ANON_KEY in the script!");
    process.exit(1);
  }

  if (TEST_USERS.admin.password === "YOUR_ADMIN_PASSWORD") {
    console.error("\n❌ ERROR: Please update admin password in the script!");
    process.exit(1);
  }

  // Run test suites
  await testAnonymousAccess();
  await testAdminAccess();
  await testStudentAccess();
  await testParentAccess();

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));
  console.log(`   ✅ Passed:  ${results.passed}`);
  console.log(`   ❌ Failed:  ${results.failed}`);
  console.log(`   ⏭️  Skipped: ${results.skipped}`);
  console.log("─".repeat(60));

  if (results.failed > 0) {
    console.log("\n⚠️  FAILED TESTS:");
    results.tests
      .filter((t) => t.passed === false)
      .forEach((t) => console.log(`   • ${t.name}: ${t.details}`));
  }

  if (results.skipped > 0) {
    console.log("\n📝 SKIPPED TESTS:");
    console.log("   Create test users in Supabase Auth Dashboard:");
    console.log("   • student@test.com");
    console.log("   • parent@test.com");
    console.log("   Then add them to profiles table with correct roles.");
  }

  const allPassed = results.failed === 0;
  console.log("\n" + "=".repeat(60));
  console.log(allPassed ? "✅ ALL TESTS PASSED!" : "❌ SOME TESTS FAILED");
  console.log("=".repeat(60));

  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
