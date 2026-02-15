/**
 * MindMosaic - Database Types
 *
 * Local schema typing for Supabase queries.
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
          full_name: string | null;
          email: string | null;
          year_level: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: "student" | "parent" | "admin";
          full_name?: string | null;
          email?: string | null;
          year_level?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: "student" | "parent" | "admin";
          full_name?: string | null;
          email?: string | null;
          year_level?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
          status: "draft" | "published" | "archived";
          instructions: string | null;
          pass_mark_percentage: number | null;
          available_from: string | null;
          available_until: string | null;
          created_at: string;
          updated_at: string;
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
          status?: "draft" | "published" | "archived";
          instructions?: string | null;
          pass_mark_percentage?: number | null;
          available_from?: string | null;
          available_until?: string | null;
          created_at?: string;
          updated_at?: string;
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
          status?: "draft" | "published" | "archived";
          instructions?: string | null;
          pass_mark_percentage?: number | null;
          available_from?: string | null;
          available_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_package_id_fkey";
            columns: ["exam_package_id"];
            isOneToOne: false;
            referencedRelation: "exam_packages";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "exam_question_options_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "exam_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      exam_correct_answers: {
        Row: {
          question_id: string;
          answer_type: string;
          correct_option_id: string | null;
          correct_option_ids: string[] | null;
          accepted_answers: Json | null;
          case_sensitive: boolean;
          exact_value: number | null;
          tolerance: number | null;
          unit: string | null;
          range_min: number | null;
          range_max: number | null;
          rubric: Json | null;
          sample_response: string | null;
        };
        Insert: {
          question_id: string;
          answer_type: string;
          correct_option_id?: string | null;
          correct_option_ids?: string[] | null;
          accepted_answers?: Json | null;
          case_sensitive?: boolean;
          exact_value?: number | null;
          tolerance?: number | null;
          unit?: string | null;
          range_min?: number | null;
          range_max?: number | null;
          rubric?: Json | null;
          sample_response?: string | null;
        };
        Update: {
          question_id?: string;
          answer_type?: string;
          correct_option_id?: string | null;
          correct_option_ids?: string[] | null;
          accepted_answers?: Json | null;
          case_sensitive?: boolean;
          exact_value?: number | null;
          tolerance?: number | null;
          unit?: string | null;
          range_min?: number | null;
          range_max?: number | null;
          rubric?: Json | null;
          sample_response?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "exam_correct_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: true;
            referencedRelation: "exam_questions";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_package_id_fkey";
            columns: ["exam_package_id"];
            isOneToOne: false;
            referencedRelation: "exam_packages";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "exam_responses_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "exam_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exam_responses_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "exam_questions";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "exam_results_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: true;
            referencedRelation: "exam_attempts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      assessment_type: "naplan" | "icas";
      attempt_status: "started" | "submitted" | "evaluated";
      difficulty: "easy" | "medium" | "hard";
      exam_status: "draft" | "published" | "archived";
      response_type: "mcq" | "multi" | "short" | "extended" | "numeric";
      user_role: "student" | "parent" | "admin";
    };
    CompositeTypes: Record<string, never>;
  };
};

// Convenience type aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ExamPackage = Database["public"]["Tables"]["exam_packages"]["Row"];
export type ExamQuestion = Database["public"]["Tables"]["exam_questions"]["Row"];
export type ExamQuestionOption =
  Database["public"]["Tables"]["exam_question_options"]["Row"];
export type ExamCorrectAnswer =
  Database["public"]["Tables"]["exam_correct_answers"]["Row"];
export type ExamAttempt = Database["public"]["Tables"]["exam_attempts"]["Row"];
export type ExamResponse = Database["public"]["Tables"]["exam_responses"]["Row"];
export type ExamResult = Database["public"]["Tables"]["exam_results"]["Row"];

export type UserRole = Database["public"]["Enums"]["user_role"];
export type ResponseType = Database["public"]["Enums"]["response_type"];
export type AttemptStatus = Database["public"]["Enums"]["attempt_status"];
