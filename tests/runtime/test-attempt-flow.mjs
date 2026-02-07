/**
 * MindMosaic Day 13: Exam Attempt Lifecycle Test Harness
 * tests/runtime/test-attempt-flow.mjs
 *
 * This script tests the complete exam attempt lifecycle:
 * 1. Start an attempt
 * 2. Save responses
 * 3. Submit the attempt
 * 4. Verify RLS boundaries
 *
 * Prerequisites:
 *   - Test users created (student@test.com, parent@test.com)
 *   - At least one published exam package with questions
 *   - Edge Functions deployed (start-attempt, save-response, submit-attempt)
 *
 * Usage: node tests/runtime/test-attempt-flow.mjs
 */

import { createClient } from "@supabase/supabase-js";

// =============================================================================
// Configuration - UPDATE THESE VALUES
// =============================================================================

const SUPABASE_URL = "https://xwofhnonojnpfzclbbro.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3b2Zobm9ub2pucGZ6Y2xiYnJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5OTg1ODgsImV4cCI6MjA4NTU3NDU4OH0.1szTGN02_-oO-HpdXrbYgNrqey8d8Ro03tTI0vslsd4";

// Edge Function URLs
const EDGE_FUNCTION_BASE = `${SUPABASE_URL}/functions/v1`;

// Test user credentials
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
// Test: Get Published Exam Package and Questions
// =============================================================================

async function getTestExamData(supabase) {
  // Get a published exam package
  const { data: packages, error: pkgError } = await supabase
    .from("exam_packages")
    .select("id, title, status")
    .eq("status", "published")
    .limit(1);

  if (pkgError || !packages || packages.length === 0) {
    throw new Error("No published exam packages found");
  }

  const examPackage = packages[0];

  // Get questions for this package
  const { data: questions, error: qError } = await supabase
    .from("exam_questions")
    .select("id, sequence_number, response_type")
    .eq("exam_package_id", examPackage.id)
    .order("sequence_number");

  if (qError || !questions || questions.length === 0) {
    throw new Error(`No questions found for package ${examPackage.id}`);
  }

  return { examPackage, questions };
}

// =============================================================================
// Test Suite: Student Attempt Flow (Happy Path)
// =============================================================================

async function testStudentAttemptFlow() {
  console.log("\n📋 STUDENT ATTEMPT FLOW TESTS (Happy Path)");
  console.log("─".repeat(60));

  let client;
  let attemptId;
  let examData;

  try {
    client = await createAuthenticatedClient(TEST_USERS.student);
    console.log(`   Signed in as: ${client.user.email}`);
  } catch (e) {
    console.log(`   ❌ Could not sign in as student: ${e.message}`);
    recordTest("Student sign-in", false, e.message);
    return { attemptId: null, examData: null };
  }

  const { supabase, session } = client;
  const accessToken = session.access_token;

  try {
    // Get test exam data
    examData = await getTestExamData(supabase);
    console.log(
      `   📚 Using exam: "${examData.examPackage.title}" (${examData.questions.length} questions)`,
    );

    // =========================================================================
    // Test 1: Start Attempt
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
          `Created attempt ${attemptId.substring(0, 8)}...`,
        );
      } else if (status === 409) {
        // Existing attempt - try to use it
        attemptId = data.existing_attempt_id;
        recordTest(
          "Start attempt",
          true,
          `Using existing attempt ${attemptId.substring(0, 8)}...`,
        );
      } else {
        recordTest("Start attempt", false, data.error || `Status: ${status}`);
        await signOut(supabase);
        return { attemptId: null, examData };
      }
    }

    // =========================================================================
    // Test 2: Verify attempt exists in database
    // =========================================================================
    {
      const { data: attempt, error } = await supabase
        .from("exam_attempts")
        .select("id, status, started_at")
        .eq("id", attemptId)
        .single();

      recordTest(
        "Attempt visible via RLS",
        !error && attempt && attempt.status === "started",
        error ? error.message : `Status: ${attempt?.status}`,
      );
    }

    // =========================================================================
    // Test 3: Cannot start duplicate attempt
    // =========================================================================
    {
      const { status, data } = await callEdgeFunction(
        "start-attempt",
        { exam_package_id: examData.examPackage.id },
        accessToken,
      );

      recordTest(
        "Cannot start duplicate attempt",
        status === 409,
        status === 409 ? "Correctly blocked" : `Status: ${status}`,
      );
    }

    // =========================================================================
    // Test 4: Save MCQ response
    // =========================================================================
    {
      const mcqQuestion = examData.questions.find(
        (q) => q.response_type === "mcq",
      );
      if (mcqQuestion) {
        const { status, data } = await callEdgeFunction(
          "save-response",
          {
            attempt_id: attemptId,
            question_id: mcqQuestion.id,
            response_data: { selectedOptionId: "B" },
          },
          accessToken,
        );

        recordTest(
          "Save MCQ response",
          status === 200 && data.response_id,
          status === 200
            ? `Response saved (update: ${data.is_update})`
            : data.error,
        );
      } else {
        recordTest("Save MCQ response", null, "No MCQ question in exam");
      }
    }

    // =========================================================================
    // Test 5: Save numeric response
    // =========================================================================
    {
      const numericQuestion = examData.questions.find(
        (q) => q.response_type === "numeric",
      );
      if (numericQuestion) {
        const { status, data } = await callEdgeFunction(
          "save-response",
          {
            attempt_id: attemptId,
            question_id: numericQuestion.id,
            response_data: { answer: 42 },
          },
          accessToken,
        );

        recordTest(
          "Save numeric response",
          status === 200 && data.response_id,
          status === 200 ? "Response saved" : data.error,
        );
      } else {
        recordTest(
          "Save numeric response",
          null,
          "No numeric question in exam",
        );
      }
    }

    // =========================================================================
    // Test 6: Save short answer response
    // =========================================================================
    {
      const shortQuestion = examData.questions.find(
        (q) => q.response_type === "short",
      );
      if (shortQuestion) {
        const { status, data } = await callEdgeFunction(
          "save-response",
          {
            attempt_id: attemptId,
            question_id: shortQuestion.id,
            response_data: { answer: "square" },
          },
          accessToken,
        );

        recordTest(
          "Save short answer response",
          status === 200 && data.response_id,
          status === 200 ? "Response saved" : data.error,
        );
      } else {
        recordTest(
          "Save short answer response",
          null,
          "No short question in exam",
        );
      }
    }

    // =========================================================================
    // Test 7: Update existing response
    // =========================================================================
    {
      const mcqQuestion = examData.questions.find(
        (q) => q.response_type === "mcq",
      );
      if (mcqQuestion) {
        const { status, data } = await callEdgeFunction(
          "save-response",
          {
            attempt_id: attemptId,
            question_id: mcqQuestion.id,
            response_data: { selectedOptionId: "C" }, // Changed from B to C
          },
          accessToken,
        );

        recordTest(
          "Update existing response",
          status === 200 && data.is_update === true,
          status === 200 ? `is_update: ${data.is_update}` : data.error,
        );
      } else {
        recordTest("Update existing response", null, "No MCQ question");
      }
    }

    // =========================================================================
    // Test 8: Responses visible via RLS
    // =========================================================================
    {
      const { data: responses, error } = await supabase
        .from("exam_responses")
        .select("id, question_id, response_data")
        .eq("attempt_id", attemptId);

      recordTest(
        "Responses visible via RLS",
        !error && responses && responses.length > 0,
        error ? error.message : `Found ${responses?.length || 0} responses`,
      );
    }

    // =========================================================================
    // Test 9: Submit attempt
    // =========================================================================
    {
      const { status, data } = await callEdgeFunction(
        "submit-attempt",
        { attempt_id: attemptId },
        accessToken,
      );

      recordTest(
        "Submit attempt",
        status === 200 && data.submitted_at,
        status === 200
          ? `Submitted (${data.answered_questions}/${data.total_questions} answered)`
          : data.error,
      );
    }

    // =========================================================================
    // Test 10: Cannot submit again
    // =========================================================================
    {
      const { status, data } = await callEdgeFunction(
        "submit-attempt",
        { attempt_id: attemptId },
        accessToken,
      );

      recordTest(
        "Cannot submit twice",
        status === 403,
        status === 403 ? "Correctly blocked" : `Status: ${status}`,
      );
    }

    // =========================================================================
    // Test 11: Cannot save response after submission
    // =========================================================================
    {
      const mcqQuestion = examData.questions.find(
        (q) => q.response_type === "mcq",
      );
      if (mcqQuestion) {
        const { status, data } = await callEdgeFunction(
          "save-response",
          {
            attempt_id: attemptId,
            question_id: mcqQuestion.id,
            response_data: { selectedOptionId: "A" },
          },
          accessToken,
        );

        recordTest(
          "Cannot save after submission",
          status === 403,
          status === 403 ? "Correctly blocked" : `Status: ${status}`,
        );
      } else {
        recordTest("Cannot save after submission", null, "No MCQ question");
      }
    }
  } catch (e) {
    console.error("   Test error:", e.message);
    recordTest("Unexpected error", false, e.message);
  }

  await signOut(supabase);
  return { attemptId, examData };
}

// =============================================================================
// Test Suite: RLS Boundary Tests
// =============================================================================

async function testRLSBoundaries(studentAttemptId, examData) {
  console.log("\n📋 RLS BOUNDARY TESTS");
  console.log("─".repeat(60));

  if (!studentAttemptId) {
    console.log("   ⏭️  Skipping RLS tests - no student attempt created");
    return;
  }

  // =========================================================================
  // Test: Parent cannot access student's attempt
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

    // Try to read student's attempt
    {
      const { data: attempts, error } = await supabase
        .from("exam_attempts")
        .select("id")
        .eq("id", studentAttemptId);

      recordTest(
        "Parent CANNOT see student attempt",
        !error && (!attempts || attempts.length === 0),
        attempts?.length > 0
          ? "SECURITY ISSUE - attempt visible!"
          : "Correctly hidden",
      );
    }

    // Try to save response to student's attempt
    {
      if (examData && examData.questions.length > 0) {
        const { status, data } = await callEdgeFunction(
          "save-response",
          {
            attempt_id: studentAttemptId,
            question_id: examData.questions[0].id,
            response_data: { selectedOptionId: "A" },
          },
          accessToken,
        );

        recordTest(
          "Parent CANNOT save to student attempt",
          status === 404 || status === 403,
          status === 200
            ? "SECURITY ISSUE - save succeeded!"
            : "Correctly blocked",
        );
      }
    }

    // Try to submit student's attempt
    {
      const { status } = await callEdgeFunction(
        "submit-attempt",
        { attempt_id: studentAttemptId },
        accessToken,
      );

      recordTest(
        "Parent CANNOT submit student attempt",
        status === 404 || status === 403,
        status === 200
          ? "SECURITY ISSUE - submit succeeded!"
          : "Correctly blocked",
      );
    }

    await signOut(supabase);
  }

  // =========================================================================
  // Test: Admin can read but uses service role for writes (if needed)
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

    // Admin can read student's attempt
    {
      const { data: attempts, error } = await supabase
        .from("exam_attempts")
        .select("id, student_id, status")
        .eq("id", studentAttemptId);

      recordTest(
        "Admin CAN read student attempt",
        !error && attempts && attempts.length > 0,
        attempts?.length > 0 ? "Correctly visible" : "Not found",
      );
    }

    // Admin can read responses
    {
      const { data: responses, error } = await supabase
        .from("exam_responses")
        .select("id, question_id")
        .eq("attempt_id", studentAttemptId);

      recordTest(
        "Admin CAN read student responses",
        !error && responses,
        `Found ${responses?.length || 0} responses`,
      );
    }

    await signOut(supabase);
  }
}

// =============================================================================
// Test Suite: Edge Case Validation
// =============================================================================

async function testEdgeCases() {
  console.log("\n📋 EDGE CASE VALIDATION TESTS");
  console.log("─".repeat(60));

  let client;
  try {
    client = await createAuthenticatedClient(TEST_USERS.student);
    console.log(`   Testing as: ${client.user.email}`);
  } catch (e) {
    console.log(`   ⏭️  Skipping edge case tests: ${e.message}`);
    return;
  }

  const { supabase, session } = client;
  const accessToken = session.access_token;

  // =========================================================================
  // Test: Invalid exam_package_id format
  // =========================================================================
  {
    const { status, data } = await callEdgeFunction(
      "start-attempt",
      { exam_package_id: "invalid-uuid" },
      accessToken,
    );

    recordTest(
      "Invalid UUID rejected",
      status === 400,
      status === 400 ? "Correctly rejected" : `Status: ${status}`,
    );
  }

  // =========================================================================
  // Test: Non-existent exam_package_id
  // =========================================================================
  {
    const { status, data } = await callEdgeFunction(
      "start-attempt",
      { exam_package_id: "00000000-0000-0000-0000-000000000000" },
      accessToken,
    );

    recordTest(
      "Non-existent package rejected",
      status === 404,
      status === 404
        ? "Correctly rejected"
        : `Status: ${status}, Error: ${data?.error}`,
    );
  }

  // =========================================================================
  // Test: Invalid response_data for MCQ
  // =========================================================================
  {
    // Get a valid attempt first
    const { data: packages } = await supabase
      .from("exam_packages")
      .select("id")
      .eq("status", "published")
      .limit(1);

    if (packages && packages.length > 0) {
      // Start a new attempt (or use existing)
      const { status: startStatus, data: startData } = await callEdgeFunction(
        "start-attempt",
        { exam_package_id: packages[0].id },
        accessToken,
      );

      const attemptId = startData.attempt_id || startData.existing_attempt_id;

      if (attemptId) {
        // Get MCQ question
        const { data: questions } = await supabase
          .from("exam_questions")
          .select("id")
          .eq("exam_package_id", packages[0].id)
          .eq("response_type", "mcq")
          .limit(1);

        if (questions && questions.length > 0) {
          // Try invalid option
          const { status, data } = await callEdgeFunction(
            "save-response",
            {
              attempt_id: attemptId,
              question_id: questions[0].id,
              response_data: { selectedOptionId: "Z" }, // Invalid option
            },
            accessToken,
          );

          recordTest(
            "Invalid MCQ option rejected",
            status === 400,
            status === 400 ? "Correctly rejected" : `Status: ${status}`,
          );
        }
      }
    }
  }

  // =========================================================================
  // Test: Missing required fields
  // =========================================================================
  {
    const { status } = await callEdgeFunction(
      "start-attempt",
      {}, // Missing exam_package_id
      accessToken,
    );

    recordTest(
      "Missing fields rejected",
      status === 400,
      status === 400 ? "Correctly rejected" : `Status: ${status}`,
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

  // =========================================================================
  // Test: No auth token
  // =========================================================================
  {
    const response = await fetch(`${EDGE_FUNCTION_BASE}/start-attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exam_package_id: "00000000-0000-0000-0000-000000000000",
      }),
    });

    recordTest(
      "No auth token rejected",
      response.status === 401,
      response.status === 401
        ? "Correctly rejected"
        : `Status: ${response.status}`,
    );
  }

  // =========================================================================
  // Test: Invalid auth token
  // =========================================================================
  {
    const response = await fetch(`${EDGE_FUNCTION_BASE}/start-attempt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid-token",
      },
      body: JSON.stringify({
        exam_package_id: "00000000-0000-0000-0000-000000000000",
      }),
    });

    recordTest(
      "Invalid auth token rejected",
      response.status === 401,
      response.status === 401
        ? "Correctly rejected"
        : `Status: ${response.status}`,
    );
  }
}

// =============================================================================
// Main Test Runner
// =============================================================================

async function runAllTests() {
  console.log("🧪 MindMosaic Day 13: Exam Attempt Lifecycle Tests");
  console.log("=".repeat(60));
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🔗 ${SUPABASE_URL}`);
  console.log(`🔗 Edge Functions: ${EDGE_FUNCTION_BASE}`);

  // Run test suites
  const { attemptId, examData } = await testStudentAttemptFlow();
  await testRLSBoundaries(attemptId, examData);
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

// Run tests
runAllTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
