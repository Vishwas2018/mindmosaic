/**
 * MindMosaic Exam Package Database Insertion
 *
 * This module handles the transactional insertion of exam package data
 * into the database. All inserts happen in a single transaction.
 *
 * Insert order (respecting foreign key dependencies):
 * 1. exam_packages
 * 2. exam_media_assets
 * 3. exam_questions
 * 4. exam_question_options
 * 5. exam_correct_answers
 *
 * Requires admin role JWT to succeed under RLS.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TransformedExamPackage } from "./transformExamPackage";

// =============================================================================
// Types
// =============================================================================

export interface InsertSuccess {
  success: true;
  examPackageId: string;
}

export interface InsertError {
  success: false;
  error: string;
  stage?: string;
}

export type InsertResult = InsertSuccess | InsertError;

// =============================================================================
// Insertion Functions
// =============================================================================

/**
 * Insert exam package metadata.
 */
async function insertExamPackage(
  supabase: SupabaseClient,
  data: TransformedExamPackage
): Promise<void> {
  const { error } = await supabase
    .from("exam_packages")
    .insert(data.examPackage);

  if (error) {
    throw new Error(`exam_packages insert failed: ${error.message}`);
  }
}

/**
 * Insert media assets.
 */
async function insertMediaAssets(
  supabase: SupabaseClient,
  data: TransformedExamPackage
): Promise<void> {
  if (data.mediaAssets.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("exam_media_assets")
    .insert(data.mediaAssets);

  if (error) {
    throw new Error(`exam_media_assets insert failed: ${error.message}`);
  }
}

/**
 * Insert questions.
 */
async function insertQuestions(
  supabase: SupabaseClient,
  data: TransformedExamPackage
): Promise<void> {
  const { error } = await supabase
    .from("exam_questions")
    .insert(data.questions);

  if (error) {
    throw new Error(`exam_questions insert failed: ${error.message}`);
  }
}

/**
 * Insert question options (MCQ only).
 */
async function insertQuestionOptions(
  supabase: SupabaseClient,
  data: TransformedExamPackage
): Promise<void> {
  if (data.questionOptions.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("exam_question_options")
    .insert(data.questionOptions);

  if (error) {
    throw new Error(`exam_question_options insert failed: ${error.message}`);
  }
}

/**
 * Insert correct answers.
 */
async function insertCorrectAnswers(
  supabase: SupabaseClient,
  data: TransformedExamPackage
): Promise<void> {
  const { error } = await supabase
    .from("exam_correct_answers")
    .insert(data.correctAnswers);

  if (error) {
    throw new Error(`exam_correct_answers insert failed: ${error.message}`);
  }
}

// =============================================================================
// Main Insert Function
// =============================================================================

/**
 * Insert a transformed exam package into the database.
 *
 * This function performs all inserts in dependency order.
 * If any insert fails, a rollback should be triggered by the caller
 * (e.g., by using Supabase RPC with a transaction wrapper, or by
 * relying on the edge function's error handling).
 *
 * NOTE: Supabase JS client does not support explicit transactions.
 * For true transactional integrity, use an RPC function or handle
 * rollback manually. This implementation inserts in order and fails
 * fast on any error.
 *
 * @param supabase - Supabase client with admin role JWT
 * @param data - Transformed exam package data
 * @returns InsertResult
 */
export async function insertExamPackageData(
  supabase: SupabaseClient,
  data: TransformedExamPackage
): Promise<InsertResult> {
  try {
    // Insert in foreign key dependency order
    await insertExamPackage(supabase, data);
    await insertMediaAssets(supabase, data);
    await insertQuestions(supabase, data);
    await insertQuestionOptions(supabase, data);
    await insertCorrectAnswers(supabase, data);

    return {
      success: true,
      examPackageId: data.examPackage.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Insert with explicit transaction using Supabase RPC.
 *
 * This function wraps all inserts in a database transaction via RPC.
 * The RPC function must exist in the database:
 *
 * CREATE OR REPLACE FUNCTION ingest_exam_package(
 *   p_package JSONB,
 *   p_media_assets JSONB,
 *   p_questions JSONB,
 *   p_options JSONB,
 *   p_answers JSONB
 * ) RETURNS UUID AS $$
 * ... (transactional insert logic)
 * $$ LANGUAGE plpgsql;
 *
 * NOTE: The RPC function is defined in a separate migration.
 * This function is provided as an alternative for true ACID compliance.
 */
export async function insertExamPackageTransaction(
  supabase: SupabaseClient,
  data: TransformedExamPackage
): Promise<InsertResult> {
  const { data: result, error } = await supabase.rpc("ingest_exam_package", {
    p_package: data.examPackage,
    p_media_assets: data.mediaAssets,
    p_questions: data.questions,
    p_options: data.questionOptions,
    p_answers: data.correctAnswers,
  });

  if (error) {
    return {
      success: false,
      error: `Transaction failed: ${error.message}`,
    };
  }

  return {
    success: true,
    examPackageId: result as string,
  };
}
