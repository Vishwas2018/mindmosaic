/**
 * MindMosaic — useAutosave Hook
 *
 * Debounced autosave for exam responses.
 * Prevents race conditions with request cancellation.
 */

import { useCallback, useRef, useEffect } from "react";
import { callEdgeFunction } from "../../../lib/supabase";
import type { ResponseData, SaveResponseResponse } from "../types/exam.types";

// =============================================================================
// Types
// =============================================================================

interface AutosaveOptions {
  /** Debounce delay in milliseconds. Default: 500 */
  debounceMs?: number;
  /** Callback when save starts */
  onSaveStart?: () => void;
  /** Callback when save completes */
  onSaveComplete?: (savedAt: Date) => void;
  /** Callback when save fails */
  onSaveError?: (error: string) => void;
}

interface UseAutosaveResult {
  /** Queue a response for saving */
  queueSave: (
    attemptId: string,
    questionId: string,
    responseType: string,
    responseData: ResponseData,
  ) => void;
  /** Flush any pending saves immediately */
  flushPending: () => Promise<void>;
  /** Cancel any pending saves */
  cancelPending: () => void;
}

export function useAutosave(options: AutosaveOptions = {}): UseAutosaveResult {
  const {
    debounceMs = 500,
    onSaveStart,
    onSaveComplete,
    onSaveError,
  } = options;

  // Track pending saves by question ID
  const pendingSaves = useRef<
    Map<
      string,
      {
        attemptId: string;
        questionId: string;
        responseType: string;
        responseData: ResponseData;
        timeoutId: ReturnType<typeof setTimeout>;
      }
    >
  >(new Map());

  // Track in-flight requests for cancellation
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Save a single response
  const saveResponse = useCallback(
    async (
      attemptId: string,
      questionId: string,
      responseType: string,
      responseData: ResponseData,
    ) => {
      // Cancel any existing request for this question
      const existingController = abortControllers.current.get(questionId);
      if (existingController) {
        existingController.abort();
      }

      // Create new abort controller
      const controller = new AbortController();
      abortControllers.current.set(questionId, controller);

      onSaveStart?.();

      try {
        const { data, error, status } =
          await callEdgeFunction<SaveResponseResponse>("save-response", {
            attempt_id: attemptId,
            question_id: questionId,
            response_data: responseData,
          });

        // Remove controller after request completes
        abortControllers.current.delete(questionId);

        if (error) {
          onSaveError?.(error);
          return;
        }

        if (data) {
          onSaveComplete?.(new Date(data.responded_at));
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        onSaveError?.(err instanceof Error ? err.message : "Unknown error");
      }
    },
    [onSaveStart, onSaveComplete, onSaveError],
  );

  // Queue a save with debouncing
  const queueSave = useCallback(
    (
      attemptId: string,
      questionId: string,
      responseType: string,
      responseData: ResponseData,
    ) => {
      // Clear existing timeout for this question
      const existing = pendingSaves.current.get(questionId);
      if (existing) {
        clearTimeout(existing.timeoutId);
      }

      // Set new timeout
      const timeoutId = setTimeout(() => {
        pendingSaves.current.delete(questionId);
        saveResponse(attemptId, questionId, responseType, responseData);
      }, debounceMs);

      // Store pending save
      pendingSaves.current.set(questionId, {
        attemptId,
        questionId,
        responseType,
        responseData,
        timeoutId,
      });
    },
    [debounceMs, saveResponse],
  );

  // Flush all pending saves immediately
  const flushPending = useCallback(async () => {
    const saves = Array.from(pendingSaves.current.values());

    // Clear all timeouts
    saves.forEach((save) => {
      clearTimeout(save.timeoutId);
    });
    pendingSaves.current.clear();

    // Execute all saves
    await Promise.all(
      saves.map((save) =>
        saveResponse(
          save.attemptId,
          save.questionId,
          save.responseType,
          save.responseData,
        ),
      ),
    );
  }, [saveResponse]);

  // Cancel all pending saves
  const cancelPending = useCallback(() => {
    // Clear all timeouts
    pendingSaves.current.forEach((save) => {
      clearTimeout(save.timeoutId);
    });
    pendingSaves.current.clear();

    // Abort all in-flight requests
    abortControllers.current.forEach((controller) => {
      controller.abort();
    });
    abortControllers.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelPending();
    };
  }, [cancelPending]);

  return {
    queueSave,
    flushPending,
    cancelPending,
  };
}
