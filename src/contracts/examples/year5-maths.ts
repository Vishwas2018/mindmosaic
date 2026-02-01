/**
 * Example Exam Package: Year 5 Mathematics
 *
 * This example demonstrates:
 * - Fraction questions with diagrams
 * - Mixed response types (MCQ, numeric, short)
 * - Mathematical reasoning questions
 * - Use of hints and tags for categorization
 */

import type { ExamPackage } from "../exam-package.schema";

export const year5MathsExam: ExamPackage = {
  metadata: {
    id: "550e8400-e29b-41d4-a716-446655440002",
    title: "Year 5 Mathematics - Fractions and Decimals",
    yearLevel: 5,
    subject: "mathematics",
    assessmentType: "naplan",
    durationMinutes: 45,
    totalMarks: 8,
    version: "1.0.0",
    schemaVersion: "1.0.0",
    status: "published",
    createdAt: "2024-01-20T14:30:00Z",
    updatedAt: "2024-01-20T14:30:00Z",
    instructions: [
      "Answer all questions.",
      "Show your working where required.",
      "Check your answers if you have time at the end.",
      "You may use a calculator for questions tagged with 'calculator'.",
    ],
  },
  questions: [
    {
      id: "660e8400-e29b-41d4-a716-446655440201",
      sequenceNumber: 1,
      difficulty: "easy",
      responseType: "mcq",
      marks: 1,
      promptBlocks: [
        {
          type: "text",
          content: "Look at the shape below.",
        },
        {
          type: "text",
          content: "What fraction of the shape is shaded?",
        },
      ],
      mediaReferences: [
        {
          mediaId: "770e8400-e29b-41d4-a716-446655440301",
          type: "diagram",
          placement: "above",
          altText:
            "A rectangle divided into 8 equal parts, with 3 parts shaded blue",
        },
      ],
      options: [
        { id: "A", content: "3/5" },
        { id: "B", content: "3/8" },
        { id: "C", content: "5/8" },
        { id: "D", content: "8/3" },
      ],
      correctAnswer: {
        type: "mcq",
        correctOptionId: "B",
      },
      tags: ["fractions", "visual-representation", "part-whole"],
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440202",
      sequenceNumber: 2,
      difficulty: "medium",
      responseType: "mcq",
      marks: 1,
      promptBlocks: [
        {
          type: "text",
          content:
            "Which list shows fractions ordered from smallest to largest?",
        },
      ],
      options: [
        { id: "A", content: "1/2, 1/4, 1/8" },
        { id: "B", content: "1/8, 1/4, 1/2" },
        { id: "C", content: "1/4, 1/2, 1/8" },
        { id: "D", content: "1/2, 1/8, 1/4" },
      ],
      correctAnswer: {
        type: "mcq",
        correctOptionId: "B",
      },
      tags: ["fractions", "ordering", "comparison"],
      hint: "Think about what happens to the size of a fraction as the denominator gets bigger.",
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440203",
      sequenceNumber: 3,
      difficulty: "medium",
      responseType: "short",
      marks: 1,
      promptBlocks: [
        {
          type: "text",
          content: "Calculate:",
        },
        {
          type: "text",
          content: "2/5 + 1/5 = ?",
        },
        {
          type: "instruction",
          content: "Write your answer as a fraction (e.g., 3/5).",
        },
      ],
      correctAnswer: {
        type: "short",
        acceptedAnswers: ["3/5"],
        caseSensitive: false,
      },
      tags: ["fractions", "addition", "same-denominator"],
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440204",
      sequenceNumber: 4,
      difficulty: "medium",
      responseType: "mcq",
      marks: 1,
      promptBlocks: [
        {
          type: "text",
          content: "The pie chart shows how Year 5 students travel to school.",
        },
        {
          type: "text",
          content: "What fraction of students walk to school?",
        },
      ],
      mediaReferences: [
        {
          mediaId: "770e8400-e29b-41d4-a716-446655440302",
          type: "graph",
          placement: "above",
          altText:
            "A pie chart divided into 4 equal sections: Car (blue), Bus (green), Walk (yellow), and Bike (red). Each section is exactly 1/4 of the circle.",
          caption: "How students travel to school",
        },
      ],
      options: [
        { id: "A", content: "1/2" },
        { id: "B", content: "1/3" },
        { id: "C", content: "1/4" },
        { id: "D", content: "1/5" },
      ],
      correctAnswer: {
        type: "mcq",
        correctOptionId: "C",
      },
      tags: ["fractions", "pie-chart", "data-interpretation"],
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440205",
      sequenceNumber: 5,
      difficulty: "hard",
      responseType: "numeric",
      marks: 1,
      promptBlocks: [
        {
          type: "text",
          content: "Convert this fraction to a decimal:",
        },
        {
          type: "text",
          content: "3/4 = ?",
        },
      ],
      correctAnswer: {
        type: "numeric",
        exactValue: 0.75,
      },
      tags: ["fractions", "decimals", "conversion", "calculator"],
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440206",
      sequenceNumber: 6,
      difficulty: "hard",
      responseType: "mcq",
      marks: 1,
      promptBlocks: [
        {
          type: "text",
          content:
            "A pizza is cut into 8 equal slices. Sarah eats 2 slices and Tom eats 3 slices.",
        },
        {
          type: "text",
          content: "What fraction of the pizza is left?",
        },
      ],
      options: [
        { id: "A", content: "1/8" },
        { id: "B", content: "2/8" },
        { id: "C", content: "3/8" },
        { id: "D", content: "5/8" },
      ],
      correctAnswer: {
        type: "mcq",
        correctOptionId: "C",
      },
      tags: ["fractions", "word-problem", "subtraction"],
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440207",
      sequenceNumber: 7,
      difficulty: "hard",
      responseType: "extended",
      marks: 2,
      promptBlocks: [
        {
          type: "text",
          content:
            "Jake has a ribbon that is 3/4 of a metre long. He cuts off 1/4 of a metre to wrap a present.",
        },
        {
          type: "list",
          ordered: false,
          items: [
            "How much ribbon does Jake have left?",
            "Explain how you worked out your answer.",
          ],
        },
      ],
      correctAnswer: {
        type: "extended",
        rubric: [
          {
            criterion: "Correct answer (1/2 metre or 2/4 metre)",
            maxMarks: 1,
          },
          {
            criterion: "Clear explanation of subtraction method",
            maxMarks: 1,
          },
        ],
        sampleResponse:
          "Jake has 1/2 metre (or 2/4 metre) left. I worked this out by subtracting 1/4 from 3/4: 3/4 - 1/4 = 2/4 = 1/2.",
      },
      tags: ["fractions", "subtraction", "word-problem", "explanation"],
    },
  ],
  mediaAssets: [
    {
      id: "770e8400-e29b-41d4-a716-446655440301",
      type: "diagram",
      filename: "fraction-rectangle-3-8.svg",
      mimeType: "image/svg+xml",
      width: 400,
      height: 100,
    },
    {
      id: "770e8400-e29b-41d4-a716-446655440302",
      type: "graph",
      filename: "transport-pie-chart.svg",
      mimeType: "image/svg+xml",
      width: 300,
      height: 300,
    },
  ],
};
