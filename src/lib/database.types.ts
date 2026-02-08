/**
 * MindMosaic — Database Types
 *
 * These types mirror the Supabase schema.
 * Generate fresh types with: npx supabase gen types typescript
 *
 * This file provides manual type definitions for Day 15 runtime.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: "student" | "parent" | "admin";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: "student" | "parent" | "admin";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: "student" | "parent" | "admin";
          created_at?: string;
          updated_at?: string;
        };
      };
      exam_packages: {
        Row: {
          id: string;
          title: string;
          year_level: number;
          subject: string;
          assessment_type: "naplan" | "icas";
          duration_minutes: number;
          total_marks: number;
          version: string;
          schema_version: string;
          status: "draft" | "published";
          instructions: string[] | null;
          created_at: string;
          updated_at: string;
          pass_mark_percentage: number | null;
        };
        Insert: {
          id: string;
          title: string;
          year_level: number;
          subject: string;
          assessment_type: "naplan" | "icas";
          duration_minutes: number;
          total_marks: number;
          version: string;
          schema_version: string;
          status?: "draft" | "published";
          instructions?: string[] | null;
          created_at?: string;
          updated_at?: string;
          pass_mark_percentage?: number | null;
        };
        Update: {
          id?: string;
          title?: string;
          year_level?: number;
          subject?: string;
          assessment_type?: "naplan" | "icas";
          duration_minutes?: number;
          total_marks?: number;
          version?: string;
          schema_version?: string;
          status?: "draft" | "published";
          instructions?: string[] | null;
          created_at?: string;
          updated_at?: string;
          pass_mark_percentage?: number | null;
        };
      };
      exam_questions: {
        Row: {
          id: string;
          exam_package_id: string;
          sequence_number: number;
          difficulty: "easy" | "medium" | "hard";
          response_type: "mcq" | "multi" | "short" | "extended" | "numeric";
          marks: number;
          prompt_blocks: Json;
          media_references: Json | null;
          tags: string[];
          hint: string | null;
        };
        Insert: {
          id: string;
          exam_package_id: string;
          sequence_number: number;
          difficulty: "easy" | "medium" | "hard";
          response_type: "mcq" | "multi" | "short" | "extended" | "numeric";
          marks?: number;
          prompt_blocks: Json;
          media_references?: Json | null;
          tags?: string[];
          hint?: string | null;
        };
        Update: {
          id?: string;
          exam_package_id?: string;
          sequence_number?: number;
          difficulty?: "easy" | "medium" | "hard";
          response_type?: "mcq" | "multi" | "short" | "extended" | "numeric";
          marks?: number;
          prompt_blocks?: Json;
          media_references?: Json | null;
          tags?: string[];
          hint?: string | null;
        };
      };
      exam_question_options: {
        Row: {
          question_id: string;
          option_id: string;
          content: string;
          media_reference: Json | null;
        };
        Insert: {
          question_id: string;
          option_id: string;
          content: string;
          media_reference?: Json | null;
        };
        Update: {
          question_id?: string;
          option_id?: string;
          content?: string;
          media_reference?: Json | null;
        };
      };
      exam_attempts: {
        Row: {
          id: string;
          exam_package_id: string;
          student_id: string;
          status: "started" | "submitted" | "evaluated";
          started_at: string;
          submitted_at: string | null;
          evaluated_at: string | null;
        };
        Insert: {
          id?: string;
          exam_package_id: string;
          student_id: string;
          status?: "started" | "submitted" | "evaluated";
          started_at?: string;
          submitted_at?: string | null;
          evaluated_at?: string | null;
        };
        Update: {
          id?: string;
          exam_package_id?: string;
          student_id?: string;
          status?: "started" | "submitted" | "evaluated";
          started_at?: string;
          submitted_at?: string | null;
          evaluated_at?: string | null;
        };
      };
      exam_responses: {
        Row: {
          id: string;
          attempt_id: string;
          question_id: string;
          response_type: "mcq" | "multi" | "short" | "extended" | "numeric";
          response_data: Json;
          responded_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          question_id: string;
          response_type: "mcq" | "multi" | "short" | "extended" | "numeric";
          response_data: Json;
          responded_at?: string;
        };
        Update: {
          id?: string;
          attempt_id?: string;
          question_id?: string;
          response_type?: "mcq" | "multi" | "short" | "extended" | "numeric";
          response_data?: Json;
          responded_at?: string;
        };
      };
      exam_results: {
        Row: {
          id: string;
          attempt_id: string;
          total_score: number;
          max_score: number;
          percentage: number;
          passed: boolean;
          breakdown: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          total_score: number;
          max_score: number;
          percentage: number;
          passed: boolean;
          breakdown: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          attempt_id?: string;
          total_score?: number;
          max_score?: number;
          percentage?: number;
          passed?: boolean;
          breakdown?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      assessment_type: "naplan" | "icas";
      attempt_status: "started" | "submitted" | "evaluated";
      difficulty: "easy" | "medium" | "hard";
      exam_status: "draft" | "published";
      response_type: "mcq" | "multi" | "short" | "extended" | "numeric";
      user_role: "student" | "parent" | "admin";
    };
  };
};

// Convenience type aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ExamPackage = Database["public"]["Tables"]["exam_packages"]["Row"];
export type ExamQuestion = Database["public"]["Tables"]["exam_questions"]["Row"];
export type ExamQuestionOption = Database["public"]["Tables"]["exam_question_options"]["Row"];
export type ExamAttempt = Database["public"]["Tables"]["exam_attempts"]["Row"];
export type ExamResponse = Database["public"]["Tables"]["exam_responses"]["Row"];
export type ExamResult = Database["public"]["Tables"]["exam_results"]["Row"];

export type UserRole = Database["public"]["Enums"]["user_role"];
export type ResponseType = Database["public"]["Enums"]["response_type"];
export type AttemptStatus = Database["public"]["Enums"]["attempt_status"];
