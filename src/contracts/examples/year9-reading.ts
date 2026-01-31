/**
 * Example Exam Package: Year 9 Reading
 *
 * This example demonstrates:
 * - Longer text prompts
 * - Quote blocks for passages
 * - No media references
 * - Higher-order thinking questions
 */

import type { ExamPackage } from "../exam-package.schema";

export const year9ReadingExam: ExamPackage = {
  metadata: {
    id: "550e8400-e29b-41d4-a716-446655440003",
    title: "Year 9 Reading Comprehension - Literary Analysis",
    yearLevel: 9,
    subject: "reading",
    assessmentType: "naplan",
    durationMinutes: 50,
    totalMarks: 10,
    version: "1.0.0",
    schemaVersion: "1.0.0",
    status: "published",
    createdAt: "2024-02-01T09:00:00Z",
    updatedAt: "2024-02-01T09:00:00Z",
    instructions: [
      "Read the passage carefully before answering the questions.",
      "Refer back to the text to support your answers.",
      "For extended response questions, write in complete sentences.",
      "Manage your time to ensure you answer all questions.",
    ],
  },
  questions: [
    {
      id: "660e8400-e29b-41d4-a716-446655440301",
      sequenceNumber: 1,
      difficulty: "easy",
      responseType: "mcq",
      marks: 1,
      promptBlocks: [
        {
          type: "instruction",
          content: "Read the following passage and answer the questions that follow.",
        },
        {
          type: "quote",
          content:
            "The morning mist hung low over the valley, obscuring the distant mountains like a grey curtain drawn across a stage. Elena stood at the edge of the cliff, her boots planted firmly on the damp earth, watching the fog slowly retreat as the sun climbed higher. She had made this journey every summer since childhood, yet each time the landscape revealed itself anew, as if the mountain had secrets it only shared with the patient.\n\nHer grandfather had first brought her here, pointing out the way certain rocks caught the early light, how the eagle nests dotted the far ridge like punctuation marks in an ancient story. Now, five years after his passing, she returned alone, carrying his worn leather journal and the weight of memories.",
          attribution: "From 'The Mountain's Memory' by Sarah Chen",
        },
        {
          type: "text",
          content: "What time of day is described in the opening of the passage?",
        },
      ],
      options: [
        { id: "A", content: "Evening" },
        { id: "B", content: "Morning" },
        { id: "C", content: "Afternoon" },
        { id: "D", content: "Midnight" },
      ],
      correctAnswer: {
        type: "mcq",
        correctOptionId: "B",
      },
      tags: ["comprehension", "literal", "time-setting"],
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440302",
      sequenceNumber: 2,
      difficulty: "easy",
      responseType: "mcq",
      marks: 1,
      promptBlocks: [
        {
          type: "text",
          content: "According to the passage, how long has it been since Elena's grandfather passed away?",
        },
      ],
      options: [
        { id: "A", content: "Three years" },
        { id: "B", content: "Four years" },
        { id: "C", content: "Five years" },
        { id: "D", content: "Ten years" },
      ],
      correctAnswer: {
        type: "mcq",
        correctOptionId: "C",
      },
      tags: ["comprehension", "literal", "detail"],
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440303",
      sequenceNumber: 3,
      difficulty: "medium",
      responseType: "mcq",
      marks: 1,
      promptBlocks: [
        {
          type: "text",
          content:
            "The phrase 'like a grey curtain drawn across a stage' is an example of which literary technique?",
        },
      ],
      options: [
        { id: "A", content: "Personification" },
        { id: "B", content: "Simile" },
        { id: "C", content: "Alliteration" },
        { id: "D", content: "Onomatopoeia" },
      ],
      correctAnswer: {
        type: "mcq",
        correctOptionId: "B",
      },
      tags: ["literary-technique", "figurative-language", "simile"],
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440304",
      sequenceNumber: 4,
      difficulty: "medium",
      responseType: "mcq",
      marks: 1,
      promptBlocks: [
        {
          type: "text",
          content:
            "What does the description of eagle nests as 'punctuation marks in an ancient story' suggest about the grandfather's view of the landscape?",
        },
      ],
      options: [
        { id: "A", content: "He thought the landscape was boring and needed decoration" },
        { id: "B", content: "He saw the natural world as a text to be read and interpreted" },
        { id: "C", content: "He believed eagles were more important than other animals" },
        { id: "D", content: "He wanted to write a book about mountains" },
      ],
      correctAnswer: {
        type: "mcq",
        correctOptionId: "B",
      },
      tags: ["inference", "metaphor", "characterisation"],
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440305",
      sequenceNumber: 5,
      difficulty: "medium",
      responseType: "short",
      marks: 1,
      promptBlocks: [
        {
          type: "text",
          content:
            "What two items does Elena bring with her on her journey? List both items.",
        },
      ],
      correctAnswer: {
        type: "short",
        acceptedAnswers: [
          "worn leather journal and memories",
          "journal and memories",
          "his journal and memories",
          "grandfather's journal and memories",
          "leather journal, memories",
          "journal, memories",
        ],
        caseSensitive: false,
      },
      tags: ["comprehension", "literal", "detail"],
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440306",
      sequenceNumber: 6,
      difficulty: "hard",
      responseType: "mcq",
      marks: 1,
      promptBlocks: [
        {
          type: "text",
          content: "What is the overall mood or atmosphere of this passage?",
        },
      ],
      options: [
        { id: "A", content: "Joyful and celebratory" },
        { id: "B", content: "Reflective and melancholic" },
        { id: "C", content: "Tense and frightening" },
        { id: "D", content: "Humorous and light-hearted" },
      ],
      correctAnswer: {
        type: "mcq",
        correctOptionId: "B",
      },
      tags: ["mood", "tone", "atmosphere", "inference"],
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440307",
      sequenceNumber: 7,
      difficulty: "hard",
      responseType: "extended",
      marks: 2,
      promptBlocks: [
        {
          type: "text",
          content:
            "Explain what the author means by saying 'the mountain had secrets it only shared with the patient.'",
        },
        {
          type: "instruction",
          content:
            "In your answer, consider what qualities 'patience' might require in this context.",
        },
      ],
      correctAnswer: {
        type: "extended",
        rubric: [
          {
            criterion:
              "Explains that the mountain reveals its beauty/meaning over time, not immediately",
            maxMarks: 1,
          },
          {
            criterion:
              "Connects patience to repeated visits, careful observation, or emotional openness",
            maxMarks: 1,
          },
        ],
        sampleResponse:
          "The author suggests that the mountain's true beauty and meaning cannot be grasped in a single visit. By 'patience,' the author means the willingness to return repeatedly, to observe carefully, and to allow oneself to form a deep connection with the landscape over time. Elena's annual visits demonstrate this patience, and through them, she has come to understand things about the mountain that a casual visitor would miss.",
      },
      tags: ["interpretation", "inference", "theme", "extended-response"],
    },
    {
      id: "660e8400-e29b-41d4-a716-446655440308",
      sequenceNumber: 8,
      difficulty: "hard",
      responseType: "extended",
      marks: 2,
      promptBlocks: [
        {
          type: "text",
          content:
            "How does the author use the physical setting to reflect Elena's emotional state? Support your answer with evidence from the passage.",
        },
      ],
      correctAnswer: {
        type: "extended",
        rubric: [
          {
            criterion:
              "Identifies connection between landscape and emotion (e.g., mist/grief, sun rising/hope)",
            maxMarks: 1,
          },
          {
            criterion: "Provides relevant textual evidence to support the interpretation",
            maxMarks: 1,
          },
        ],
        sampleResponse:
          "The author uses the physical setting to mirror Elena's grief and gradual healing. The 'morning mist' that 'obscures' the mountains parallels how grief can cloud our perception and memory. As the sun climbs and the fog 'slowly retreats,' this reflects Elena's own emotional journey—her memories becoming clearer with time and her ability to face her loss improving. The 'weight of memories' she carries connects directly to the physical landscape she has known since childhood.",
      },
      tags: [
        "literary-analysis",
        "symbolism",
        "setting",
        "characterisation",
        "extended-response",
      ],
    },
  ],
  mediaAssets: [],
};
