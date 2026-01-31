/**
 * Example Exam Package: Year 2 Numeracy
 *
 * This example demonstrates:
 * - Simple MCQ questions
 * - Image media references
 * - Basic arithmetic for young learners
 */

import type { ExamPackage } from "../exam-package.schema";

export const year2NumeracyExam: ExamPackage = {
  metadata: {
    id: "550e8400-e29b-41d4-a716-446655440001",
    title: "Year 2 Numeracy Practice Test - Addition and Subtraction",
    yearLevel: 2,
    subject: "numeracy",
    assessmentType: "naplan",
    durationMinutes: 30,
    totalMarks: 5,
    version: "1.0.0",
    schemaVersion: "1.0.0",
    status: "published",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
    instructions: [
      "Read each question carefully.",
      "Choose the best answer from the options given.",
      "You may use the number line to help you.",
    ],
  },
  questions: [
    {
      id: "660e8400-e29b-41d4-a716-446655440101",
      sequenceNumber: 1,
      difficulty: "easy",
      responseType: "mcq",
      marks: 1,
      promptBlocks: [
        {
          type: "text",
          content: "Look at the picture of apples below.",
        },
        {
          type: "text",
          content: "How many apples are there in total?",
        },
      ],
      mediaReferences: [
        {
          mediaId: "770e8400-e29b-41d4-a716-446655440201",
          type: "image",
          placement: "above",
          altText:
            "Two groups of apples: one group has 3 red apples, another group has 4 green apples",
          caption: "Count all the apples",
        },
      ],
      options: [
        { id: "A", content: "5" },
        { id: "B", content: "6" },
        { id: "C", content: "7" },
        { id: "D", content: "8" },
      ],
      correctAnswer: {
        type: "mcq",
        correctOptionId: "C",
      },
      tags: ["addition", "counting", "objects"],
      hint: "Count each group and add them together.",
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440102",
      sequenceNumber: 2,
      difficulty: "easy",
      responseType: "mcq",
      marks: 1,
      promptBlocks: [
        {
          type: "text",
          content: "Sam had 9 stickers. He gave 3 stickers to his friend.",
        },
        {
          type: "text",
          content: "How many stickers does Sam have now?",
        },
      ],
      options: [
        { id: "A", content: "4" },
        { id: "B", content: "5" },
        { id: "C", content: "6" },
        { id: "D", content: "12" },
      ],
      correctAnswer: {
        type: "mcq",
        correctOptionId: "C",
      },
      tags: ["subtraction", "word-problem"],
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440103",
      sequenceNumber: 3,
      difficulty: "medium",
      responseType: "mcq",
      marks: 1,
      promptBlocks: [
        {
          type: "text",
          content: "What number goes in the box to make this number sentence true?",
        },
        {
          type: "text",
          content: "5 + □ = 12",
        },
      ],
      options: [
        { id: "A", content: "5" },
        { id: "B", content: "6" },
        { id: "C", content: "7" },
        { id: "D", content: "8" },
      ],
      correctAnswer: {
        type: "mcq",
        correctOptionId: "C",
      },
      tags: ["addition", "missing-number", "number-sentence"],
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440104",
      sequenceNumber: 4,
      difficulty: "medium",
      responseType: "numeric",
      marks: 1,
      promptBlocks: [
        {
          type: "text",
          content: "Look at the number line below.",
        },
        {
          type: "text",
          content: "What number is the arrow pointing to?",
        },
      ],
      mediaReferences: [
        {
          mediaId: "770e8400-e29b-41d4-a716-446655440202",
          type: "diagram",
          placement: "above",
          altText:
            "A number line from 0 to 20 with an arrow pointing to the position at 14",
        },
      ],
      correctAnswer: {
        type: "numeric",
        exactValue: 14,
      },
      tags: ["number-line", "place-value"],
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440105",
      sequenceNumber: 5,
      difficulty: "hard",
      responseType: "short",
      marks: 1,
      promptBlocks: [
        {
          type: "text",
          content:
            "Emma has 8 pencils. She buys 5 more pencils. Then she gives 4 pencils to her brother.",
        },
        {
          type: "text",
          content: "How many pencils does Emma have now?",
        },
        {
          type: "instruction",
          content: "Write your answer as a number.",
        },
      ],
      correctAnswer: {
        type: "short",
        acceptedAnswers: ["9", "nine"],
        caseSensitive: false,
      },
      tags: ["addition", "subtraction", "multi-step", "word-problem"],
      hint: "First add, then subtract.",
    },
  ],
  mediaAssets: [
    {
      id: "770e8400-e29b-41d4-a716-446655440201",
      type: "image",
      filename: "apples-counting.png",
      mimeType: "image/png",
      width: 400,
      height: 200,
    },
    {
      id: "770e8400-e29b-41d4-a716-446655440202",
      type: "diagram",
      filename: "number-line-0-20.svg",
      mimeType: "image/svg+xml",
      width: 600,
      height: 100,
    },
  ],
};
