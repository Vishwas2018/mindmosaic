/**
 * MindMosaic Day 14 HARDENED: Scoring Engine Test Harness
 * tests/runtime/test-scoring-flow.mjs
 *
 * SECURITY TESTS ADDED:
 * - Student CANNOT insert exam_results directly
 * - Score-attempt works without service role
 * - Attempt status transitions only via scoring RPC
 * - Idempotency verified
 * - Multi-select scoring verified
 * - Extended responses remain unscored
 *
 * Prerequisites:
 *   - Test users created (student@test.com, parent@test.com, admin)
 *   - Published exam package with multiple question types
 *   - 014_scoring_engine_hardened.sql migration applied
 *   - Edge Function deployed (score-attempt)
 *
 * Usage: node tests/runtime/test-scoring-flow.mjs
 */

import { createClient } from "@supabase/supabase-js";

// =============================================================================
// Configuration
// =============================================================================

const SUPABASE_URL = "https://xwofhnonojnpfzclbbro.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3b2Zobm9ub2pucGZ6Y2xiYnJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5OTg1ODgsImV4cCI6MjA4NTU3NDU4OH0.1szTGN02_-oO-HpdXrbYgNrqey8d8Ro03tTI0vslsd4";

const EDGE_FUNCTION_BASE = `${SUPABASE_URL}/functions/v1`;

const TEST_USERS = {
  student: {
    email: "student@test.com",
    password: "TestStudent123!",
  },
  parent: {
    email: "parent@test.com",
    password: "TestParent123!",
  },
  admin: {
    email: "jvishu21@gmail.com",
    password: "MindMosaic@123",
  },
};

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

async function callEdgeFunction(functionName, body, accessToken) {
  const response = await fetch(`${EDGE_FUNCTION_BASE}/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return { status: response.status, data };
}

async function signOut(supabase) {
  await supabase.auth.signOut();
}

// =============================================================================
// Get Test Exam Data
// =============================================================================

async function getTestExamData(supabase) {
  const { data: packages, error: pkgError } = await supabase
    .from("exam_packages")
    .select("id, title, status, pass_mark_percentage")
    .eq("status", "published")
    .limit(1);

  if (pkgError || !packages || packages.length === 0) {
    throw new Error("No published exam packages found. Run ingestion first.");
  }

  const examPackage = packages[0];

  const { data: questions, error: qError } = await supabase
    .from("exam_questions")
    .select("id, sequence_number, response_type, marks")
    .eq("exam_package_id", examPackage.id)
    .order("sequence_number");

  if (qError || !questions || questions.length === 0) {
    throw new Error(`No questions found for package ${examPackage.id}`);
  }

  return { examPackage, questions };
}

// =============================================================================
// Test Suite: Security Tests (CRITICAL)
// =============================================================================

async function testSecurityBoundaries() {
  console.log("\n🔐 SECURITY BOUNDARY TESTS (CRITICAL)");
  console.log("─".repeat(60));

  let client;
  try {
    client = await createAuthenticatedClient(TEST_USERS.student);
    console.log(`   Testing as student: ${client.user.email}`);
  } catch (e) {
    console.log(`   ❌ Could not sign in: ${e.message}`);
    recordTest("Student sign-in for security tests", false, e.message);
    return;
  }

  const { supabase, session } = client;

  // =========================================================================
  // CRITICAL TEST: Student CANNOT insert exam_results directly
  // =========================================================================
  {
    // First, get a submitted attempt to try to forge a result for
    const { data: attempts } = await supabase
      .from("exam_attempts")
      .select("id")
      .eq("status", "submitted")
      .limit(1);

    if (attempts && attempts.length > 0) {
      const attemptId = attempts[0].id;

      // Try direct INSERT (should fail due to RLS)
      const { data, error } = await supabase
        .from("exam_results")
        .insert({
          attempt_id: attemptId,
          total_score: 100,
          max_score: 100,
          percentage: 100,
          passed: true,
          breakdown: [],
        })
        .select();

      recordTest(
        "Student CANNOT insert exam_results directly",
        error !== null,
        error
          ? "Correctly blocked by RLS"
          : "SECURITY ISSUE - INSERT succeeded!",
      );
    } else {
      // Create a test attempt to try
      const { data: examData } = await getTestExamData(supabase).catch(
        () => null,
      );

      if (examData) {
        // Try direct INSERT with fake attempt_id
        const { data, error } = await supabase
          .from("exam_results")
          .insert({
            attempt_id: "00000000-0000-0000-0000-000000000001",
            total_score: 100,
            max_score: 100,
            percentage: 100,
            passed: true,
            breakdown: [],
          })
          .select();

        recordTest(
          "Student CANNOT insert exam_results directly",
          error !== null,
          error
            ? "Correctly blocked by RLS"
            : "SECURITY ISSUE - INSERT succeeded!",
        );
      } else {
        recordTest(
          "Student CANNOT insert exam_results directly",
          null,
          "No test data available",
        );
      }
    }
  }

  // =========================================================================
  // CRITICAL TEST: Student CANNOT update exam_attempts status directly
  // =========================================================================
  {
    const { data: attempts } = await supabase
      .from("exam_attempts")
      .select("id, status")
      .eq("status", "submitted")
      .limit(1);

    if (attempts && attempts.length > 0) {
      const attemptId = attempts[0].id;

      // Try direct UPDATE to evaluated (should fail or be blocked by RLS/constraint)
      const { data, error } = await supabase
        .from("exam_attempts")
        .update({ status: "evaluated", evaluated_at: new Date().toISOString() })
        .eq("id", attemptId)
        .select();

      // Either error or no rows affected is acceptable
      const blocked = error !== null || !data || data.length === 0;

      recordTest(
        "Student CANNOT update attempt status directly",
        blocked,
        blocked ? "Correctly blocked" : "SECURITY ISSUE - UPDATE succeeded!",
      );
    } else {
      recordTest(
        "Student CANNOT update attempt status directly",
        null,
        "No submitted attempts to test",
      );
    }
  }

  // =========================================================================
  // CRITICAL TEST: Student CANNOT access correct answers directly
  // =========================================================================
  {
    const { data: answers, error } = await supabase
      .from("exam_correct_answers")
      .select("*")
      .limit(1);

    recordTest(
      "Student CANNOT access correct_answers table",
      error !== null || !answers || answers.length === 0,
      answers && answers.length > 0
        ? "SECURITY ISSUE - answers visible!"
        : "Correctly hidden",
    );
  }

  await signOut(supabase);
}

// =============================================================================
// Test Suite: Complete Scoring Flow
// =============================================================================

async function testCompleteScoringFlow() {
  console.log("\n📋 COMPLETE SCORING FLOW TESTS");
  console.log("─".repeat(60));

  let client;
  let attemptId;
  let examData;
  let scoreResult;

  try {
    client = await createAuthenticatedClient(TEST_USERS.student);
    console.log(`   Signed in as: ${client.user.email}`);
  } catch (e) {
    console.log(`   ❌ Could not sign in as student: ${e.message}`);
    recordTest("Student sign-in", false, e.message);
    return { attemptId: null, examData: null, scoreResult: null };
  }

  const { supabase, session, user } = client;
  const accessToken = session.access_token;

  try {
    examData = await getTestExamData(supabase);
    console.log(`   📚 Using exam: "${examData.examPackage.title}"`);
    console.log(`   📝 Questions: ${examData.questions.length}`);
    console.log(
      `   🎯 Pass mark: ${examData.examPackage.pass_mark_percentage || 50}%`,
    );

    const questionTypes = [
      ...new Set(examData.questions.map((q) => q.response_type)),
    ];
    console.log(`   📊 Question types: ${questionTypes.join(", ")}`);

    // =========================================================================
    // Step 1: Start a new attempt
    // =========================================================================
    {
      const { status, data } = await callEdgeFunction(
        "start-attempt",
        { exam_package_id: examData.examPackage.id },
        accessToken,
      );

      if (status === 201 && data.attempt_id) {
        attemptId = data.attempt_id;
        recordTest(
          "Start attempt",
          true,
          `Created ${attemptId.substring(0, 8)}...`,
        );
      } else if (status === 409 && data.existing_attempt_id) {
        attemptId = data.existing_attempt_id;
        recordTest(
          "Start attempt",
          true,
          `Using existing ${attemptId.substring(0, 8)}...`,
        );
      } else {
        recordTest("Start attempt", false, data.error || `Status: ${status}`);
        await signOut(supabase);
        return { attemptId: null, examData, scoreResult: null };
      }
    }

    // =========================================================================
    // Step 2: Save responses for each question type
    // =========================================================================
    for (const question of examData.questions) {
      let responseData;

      switch (question.response_type) {
        case "mcq":
          responseData = { selectedOptionId: "C" };
          break;
        case "multi":
          // Multi-select: select multiple options
          responseData = { selectedOptionIds: ["A", "C"] };
          break;
        case "numeric":
          responseData = { answer: 5 };
          break;
        case "short":
          responseData = { answer: "square" };
          break;
        case "extended":
          responseData = { answer: "This is my detailed extended response." };
          break;
        default:
          responseData = { answer: "test" };
      }

      const { status, data } = await callEdgeFunction(
        "save-response",
        {
          attempt_id: attemptId,
          question_id: question.id,
          response_data: responseData,
        },
        accessToken,
      );

      recordTest(
        `Save ${question.response_type} response`,
        status === 200,
        status === 200
          ? `Saved Q${question.sequence_number}`
          : data.error || `Status: ${status}`,
      );
    }

    // =========================================================================
    // Step 3: Submit the attempt
    // =========================================================================
    {
      const { status, data } = await callEdgeFunction(
        "submit-attempt",
        { attempt_id: attemptId },
        accessToken,
      );

      recordTest(
        "Submit attempt",
        status === 200,
        status === 200
          ? `${data.answered_questions}/${data.total_questions} answered`
          : data.error || `Status: ${status}`,
      );

      if (status !== 200) {
        await signOut(supabase);
        return { attemptId, examData, scoreResult: null };
      }
    }

    // =========================================================================
    // Step 4: Score the attempt (via Edge Function using RPCs)
    // =========================================================================
    {
      const { status, data } = await callEdgeFunction(
        "score-attempt",
        { attempt_id: attemptId },
        accessToken,
      );

      if (status === 200) {
        scoreResult = data;
        recordTest(
          "Score attempt (via RPC)",
          true,
          `${data.total_score}/${data.max_score} (${data.percentage}%) - ${data.passed ? "PASSED" : "FAILED"}`,
        );
      } else {
        recordTest(
          "Score attempt (via RPC)",
          false,
          data.error || `Status: ${status}`,
        );
        await signOut(supabase);
        return { attemptId, examData, scoreResult: null };
      }
    }

    // =========================================================================
    // Step 5: Verify result exists in database
    // =========================================================================
    {
      const { data: dbResult, error } = await supabase
        .from("exam_results")
        .select("*")
        .eq("attempt_id", attemptId)
        .single();

      recordTest(
        "Result exists in database",
        !error && dbResult && dbResult.total_score === scoreResult.total_score,
        error
          ? error.message
          : `Score: ${dbResult?.total_score}/${dbResult?.max_score}`,
      );
    }

    // =========================================================================
    // Step 6: Verify attempt status updated to evaluated
    // =========================================================================
    {
      const { data: attempt, error } = await supabase
        .from("exam_attempts")
        .select("status, evaluated_at")
        .eq("id", attemptId)
        .single();

      recordTest(
        "Attempt marked as evaluated",
        !error && attempt && attempt.status === "evaluated",
        error ? error.message : `Status: ${attempt?.status}`,
      );
    }

    // =========================================================================
    // Step 7: Verify breakdown contains all questions
    // =========================================================================
    {
      const breakdown = scoreResult.breakdown || [];
      const allQuestionsScored = breakdown.length === examData.questions.length;

      recordTest(
        "Breakdown contains all questions",
        allQuestionsScored,
        `${breakdown.length}/${examData.questions.length} questions`,
      );
    }

    // =========================================================================
    // Step 8: Verify extended questions flagged for manual review
    // =========================================================================
    {
      const breakdown = scoreResult.breakdown || [];
      const extendedQuestions = examData.questions.filter(
        (q) => q.response_type === "extended",
      );

      if (extendedQuestions.length > 0) {
        const extendedBreakdown = breakdown.filter(
          (b) => b.response_type === "extended",
        );
        const allFlagged = extendedBreakdown.every(
          (b) => b.requires_manual_review === true,
        );
        const allZeroScore = extendedBreakdown.every((b) => b.score === 0);

        recordTest(
          "Extended questions flagged & unscored",
          allFlagged && allZeroScore,
          `Flagged: ${extendedBreakdown.filter((b) => b.requires_manual_review).length}, Score: ${extendedBreakdown.reduce((s, b) => s + b.score, 0)}`,
        );
      } else {
        recordTest(
          "Extended questions flagged & unscored",
          null,
          "No extended questions",
        );
      }
    }

    // =========================================================================
    // Step 9: Verify multi-select questions scored correctly
    // =========================================================================
    {
      const breakdown = scoreResult.breakdown || [];
      const multiQuestions = examData.questions.filter(
        (q) => q.response_type === "multi",
      );

      if (multiQuestions.length > 0) {
        const multiBreakdown = breakdown.filter(
          (b) => b.response_type === "multi",
        );

        // Just verify they were scored (0 or max_score, no partial)
        const validScoring = multiBreakdown.every(
          (b) => b.score === 0 || b.score === b.max_score,
        );

        recordTest(
          "Multi-select scoring (no partial credit)",
          validScoring,
          `${multiBreakdown.length} multi-select questions scored`,
        );
      } else {
        recordTest(
          "Multi-select scoring (no partial credit)",
          null,
          "No multi-select questions",
        );
      }
    }

    // =========================================================================
    // Step 10: Verify no correct answers leaked in breakdown
    // =========================================================================
    {
      const breakdown = scoreResult.breakdown || [];
      const hasCorrectAnswers = breakdown.some(
        (b) =>
          b.correct_option_id ||
          b.accepted_answers ||
          b.exact_value ||
          b.correct_answer,
      );

      recordTest(
        "No correct answers leaked in breakdown",
        !hasCorrectAnswers,
        hasCorrectAnswers
          ? "SECURITY ISSUE - answers leaked!"
          : "Clean breakdown",
      );
    }

    // =========================================================================
    // Step 11: Verify idempotency (second call returns same result)
    // =========================================================================
    {
      const { status, data } = await callEdgeFunction(
        "score-attempt",
        { attempt_id: attemptId },
        accessToken,
      );

      const isSameResult =
        status === 200 &&
        data.total_score === scoreResult.total_score &&
        data.max_score === scoreResult.max_score &&
        data.percentage === scoreResult.percentage;

      recordTest(
        "Idempotent (second call returns same)",
        isSameResult,
        isSameResult ? "Same scores returned" : `Different results`,
      );
    }

    // =========================================================================
    // Step 12: Verify cannot score unsubmitted attempt
    // =========================================================================
    {
      const { status: startStatus, data: startData } = await callEdgeFunction(
        "start-attempt",
        { exam_package_id: examData.examPackage.id },
        accessToken,
      );

      if (startStatus === 201 && startData.attempt_id) {
        const newAttemptId = startData.attempt_id;

        const { status, data } = await callEdgeFunction(
          "score-attempt",
          { attempt_id: newAttemptId },
          accessToken,
        );

        recordTest(
          "Cannot score unsubmitted attempt",
          status === 403,
          status === 403 ? "Correctly blocked" : `Status: ${status}`,
        );
      } else {
        recordTest(
          "Cannot score unsubmitted attempt",
          null,
          "No new attempt available",
        );
      }
    }
  } catch (e) {
    console.error("   Test error:", e.message);
    recordTest("Unexpected error", false, e.message);
  }

  await signOut(supabase);
  return { attemptId, examData, scoreResult };
}

// =============================================================================
// Test Suite: RLS Boundary Tests
// =============================================================================

async function testRLSBoundaries(studentAttemptId, examData, scoreResult) {
  console.log("\n📋 RLS BOUNDARY TESTS");
  console.log("─".repeat(60));

  if (!studentAttemptId || !scoreResult) {
    console.log("   ⏭️  Skipping RLS tests - no scored attempt available");
    return;
  }

  // =========================================================================
  // Test: Parent cannot see student's result
  // =========================================================================
  {
    let client;
    try {
      client = await createAuthenticatedClient(TEST_USERS.parent);
      console.log(`   Testing as parent: ${client.user.email}`);
    } catch (e) {
      recordTest("Parent sign-in", null, "User not created");
      return;
    }

    const { supabase, session } = client;
    const accessToken = session.access_token;

    // Try to read via database
    {
      const { data: results, error } = await supabase
        .from("exam_results")
        .select("*")
        .eq("attempt_id", studentAttemptId);

      recordTest(
        "Parent CANNOT see student result (DB)",
        !error && (!results || results.length === 0),
        results?.length > 0 ? "SECURITY ISSUE!" : "Correctly hidden",
      );
    }

    // Try to call score-attempt
    {
      const { status } = await callEdgeFunction(
        "score-attempt",
        { attempt_id: studentAttemptId },
        accessToken,
      );

      recordTest(
        "Parent CANNOT score student attempt",
        status === 404 || status === 403,
        status === 200 ? "SECURITY ISSUE!" : `Blocked (${status})`,
      );
    }

    await signOut(supabase);
  }

  // =========================================================================
  // Test: Admin can see and update student's result
  // =========================================================================
  {
    let client;
    try {
      client = await createAuthenticatedClient(TEST_USERS.admin);
      console.log(`   Testing as admin: ${client.user.email}`);
    } catch (e) {
      recordTest("Admin sign-in", null, e.message);
      return;
    }

    const { supabase } = client;

    // Admin can read
    {
      const { data: results, error } = await supabase
        .from("exam_results")
        .select("*")
        .eq("attempt_id", studentAttemptId);

      recordTest(
        "Admin CAN see student result",
        !error && results && results.length > 0,
        results?.length > 0
          ? `Score: ${results[0].total_score}/${results[0].max_score}`
          : "Not found",
      );
    }

    // Admin can update (for manual review)
    {
      const { data: results } = await supabase
        .from("exam_results")
        .select("id, total_score")
        .eq("attempt_id", studentAttemptId)
        .single();

      if (results) {
        const { error } = await supabase
          .from("exam_results")
          .update({ total_score: results.total_score }) // No actual change
          .eq("id", results.id);

        recordTest(
          "Admin CAN update result (manual review)",
          !error,
          error ? error.message : "Update allowed",
        );
      }
    }

    await signOut(supabase);
  }

  // =========================================================================
  // Test: Student can see their own result
  // =========================================================================
  {
    let client;
    try {
      client = await createAuthenticatedClient(TEST_USERS.student);
      console.log(`   Testing student's own access: ${client.user.email}`);
    } catch (e) {
      recordTest("Student re-login", null, e.message);
      return;
    }

    const { supabase } = client;

    {
      const { data: results, error } = await supabase
        .from("exam_results")
        .select("*")
        .eq("attempt_id", studentAttemptId);

      recordTest(
        "Student CAN see own result",
        !error && results && results.length > 0,
        results?.length > 0
          ? `Score: ${results[0].total_score}/${results[0].max_score}`
          : "Not found",
      );
    }

    // Student CANNOT update their result
    {
      const { data: results } = await supabase
        .from("exam_results")
        .select("id")
        .eq("attempt_id", studentAttemptId)
        .single();

      if (results) {
        const { error } = await supabase
          .from("exam_results")
          .update({ total_score: 999 })
          .eq("id", results.id);

        recordTest(
          "Student CANNOT update own result",
          error !== null,
          error ? "Correctly blocked" : "SECURITY ISSUE - update allowed!",
        );
      }
    }

    await signOut(supabase);
  }
}

// =============================================================================
// Test Suite: Edge Cases
// =============================================================================

async function testEdgeCases() {
  console.log("\n📋 EDGE CASE TESTS");
  console.log("─".repeat(60));

  let client;
  try {
    client = await createAuthenticatedClient(TEST_USERS.student);
  } catch (e) {
    console.log(`   ⏭️  Skipping: ${e.message}`);
    return;
  }

  const { supabase, session } = client;
  const accessToken = session.access_token;

  // Invalid UUID
  {
    const { status } = await callEdgeFunction(
      "score-attempt",
      { attempt_id: "invalid-uuid" },
      accessToken,
    );
    recordTest("Invalid UUID rejected", status === 400, `Status: ${status}`);
  }

  // Non-existent attempt
  {
    const { status } = await callEdgeFunction(
      "score-attempt",
      { attempt_id: "00000000-0000-0000-0000-000000000000" },
      accessToken,
    );
    recordTest(
      "Non-existent attempt rejected",
      status === 404,
      `Status: ${status}`,
    );
  }

  // Missing attempt_id
  {
    const { status } = await callEdgeFunction("score-attempt", {}, accessToken);
    recordTest(
      "Missing attempt_id rejected",
      status === 400,
      `Status: ${status}`,
    );
  }

  await signOut(supabase);
}

// =============================================================================
// Test Suite: Unauthorized Access
// =============================================================================

async function testUnauthorizedAccess() {
  console.log("\n📋 UNAUTHORIZED ACCESS TESTS");
  console.log("─".repeat(60));

  // No auth token
  {
    const response = await fetch(`${EDGE_FUNCTION_BASE}/score-attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attempt_id: "00000000-0000-0000-0000-000000000000",
      }),
    });
    recordTest(
      "No auth token rejected",
      response.status === 401,
      `Status: ${response.status}`,
    );
  }

  // Invalid auth token
  {
    const response = await fetch(`${EDGE_FUNCTION_BASE}/score-attempt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid-token",
      },
      body: JSON.stringify({
        attempt_id: "00000000-0000-0000-0000-000000000000",
      }),
    });
    recordTest(
      "Invalid auth token rejected",
      response.status === 401,
      `Status: ${response.status}`,
    );
  }
}

// =============================================================================
// Main Test Runner
// =============================================================================

async function runAllTests() {
  console.log("🧪 MindMosaic Day 14 HARDENED: Scoring Engine Tests");
  console.log("=".repeat(60));
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🔗 ${SUPABASE_URL}`);
  console.log(`🔐 Security hardening applied`);

  // Run security tests FIRST
  await testSecurityBoundaries();

  // Then run flow tests
  const { attemptId, examData, scoreResult } = await testCompleteScoringFlow();
  await testRLSBoundaries(attemptId, examData, scoreResult);
  await testEdgeCases();
  await testUnauthorizedAccess();

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
    results.tests
      .filter((t) => t.passed === null)
      .forEach((t) => console.log(`   • ${t.name}: ${t.details}`));
  }

  const allPassed = results.failed === 0;
  console.log("\n" + "=".repeat(60));
  console.log(allPassed ? "✅ ALL TESTS PASSED!" : "❌ SOME TESTS FAILED");
  console.log("=".repeat(60));

  process.exit(allPassed ? 0 : 1);
}

runAllTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
