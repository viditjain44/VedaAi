import Groq from 'groq-sdk';
import { config } from '../config';
import type {
  GeneratedPaper,
  PaperSection,
  GeneratedQuestion,
  QuestionType,
  Difficulty,
} from '@veda-ai/shared';
import { v4 as uuidv4 } from 'uuid';
import type { GenerationJobData } from './queue';

const groq = new Groq({ apiKey: config.groqApiKey });
const MODEL = 'llama-3.3-70b-versatile';

interface RawQuestion {
  text: string;
  type: string;
  difficulty: string;
  marks: number;
  options?: string[];
  expectedAnswer?: string;
}

interface RawSection {
  label: string;
  title: string;
  instruction: string;
  questions: RawQuestion[];
}

interface RawPaper {
  title: string;
  generalInstructions: string[];
  sections: RawSection[];
}

function buildPrompt(data: GenerationJobData): string {
  const sectionLines = data.questionConfigs
    .map(
      (c, i) =>
        `  Section ${String.fromCharCode(65 + i)}: ${c.count} ` +
        `${c.type.replace(/_/g, ' ')} questions, ` +
        `${c.marksPerQuestion} marks each, difficulty: ${c.difficulty}`
    )
    .join('\n');

  return `You are an expert educational assessment creator for Indian schools.
Generate a complete, high-quality exam paper in strict JSON format.

ASSIGNMENT DETAILS:
- Title: ${data.title}
- Subject: ${data.subject}
- Grade/Class: ${data.grade}
- Topic/Chapter: ${data.topic || 'General curriculum'}
- Total Marks: ${data.totalMarks}
- Duration: ${data.duration} minutes
- Special Instructions: ${data.instructions || 'None'}
${data.fileContent ? `\nREFERENCE MATERIAL:\n${data.fileContent.slice(0, 2500)}` : ''}

QUESTION SECTIONS TO GENERATE:
${sectionLines}

OUTPUT RULES:
1. Respond ONLY with a valid JSON object — no markdown fences, no explanation
2. Each section maps EXACTLY to the config above in the same order
3. Generate EXACTLY the specified number of questions per section
4. difficulty must be one of: easy, medium, hard
5. type must be one of: multiple_choice, short_answer, long_answer, true_false, fill_in_the_blank, essay
6. Multiple choice questions MUST have exactly 4 options prefixed: "A. ", "B. ", "C. ", "D. "
7. Questions must be academically appropriate for ${data.grade}
8. generalInstructions must have exactly 5 items

REQUIRED JSON STRUCTURE:
{
  "title": "string",
  "generalInstructions": ["string","string","string","string","string"],
  "sections": [
    {
      "label": "Section A",
      "title": "Multiple Choice Questions",
      "instruction": "Attempt all questions. Each question carries 1 mark.",
      "questions": [
        {
          "text": "Question text here?",
          "type": "multiple_choice",
          "difficulty": "easy",
          "marks": 1,
          "options": ["A. Option1","B. Option2","C. Option3","D. Option4"],
          "expectedAnswer": "B"
        }
      ]
    }
  ]
}`;
}

function parsePaperResponse(raw: string, data: GenerationJobData): GeneratedPaper {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed: RawPaper;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`AI returned invalid JSON. Starts with: "${raw.slice(0, 300)}"`);
  }

  if (!parsed.sections || !Array.isArray(parsed.sections)) {
    throw new Error('AI response is missing the sections array');
  }

  const VALID_TYPES = [
    'multiple_choice','short_answer','long_answer',
    'true_false','fill_in_the_blank','essay',
  ];

  const sections: PaperSection[] = parsed.sections.map((sec, sIdx) => {
    const cfg = data.questionConfigs[sIdx];

    const questions: GeneratedQuestion[] = (sec.questions || []).map((q) => ({
      id: uuidv4(),
      text: q.text || 'Question text unavailable',
      type: (VALID_TYPES.includes(q.type) ? q.type : cfg?.type || 'short_answer') as QuestionType,
      difficulty: (['easy','medium','hard'].includes(q.difficulty) ? q.difficulty : 'medium') as Difficulty,
      marks: typeof q.marks === 'number' && q.marks > 0 ? q.marks : cfg?.marksPerQuestion || 1,
      options: q.options,
      expectedAnswer: q.expectedAnswer,
    }));

    return {
      id: uuidv4(),
      label: sec.label || `Section ${String.fromCharCode(65 + sIdx)}`,
      title: sec.title || 'Questions',
      instruction: sec.instruction || 'Attempt all questions.',
      totalMarks: questions.reduce((sum, q) => sum + q.marks, 0),
      questions,
    };
  });

  return {
    id: uuidv4(),
    assignmentId: data.assignmentId,
    title: parsed.title || data.title,
    subject: data.subject,
    grade: data.grade,
    duration: data.duration,
    totalMarks: sections.reduce((sum, s) => sum + s.totalMarks, 0),
    dueDate: data.dueDate,
    generalInstructions: Array.isArray(parsed.generalInstructions)
      ? parsed.generalInstructions
      : [
          'All questions are compulsory unless stated otherwise.',
          'Read each question carefully before answering.',
          'Write legibly in blue or black ink.',
          'Show all working where applicable.',
          'Mobile phones and electronic devices are not permitted.',
        ],
    sections,
    createdAt: new Date().toISOString(),
  };
}

export async function generatePaper(data: GenerationJobData): Promise<GeneratedPaper> {
  if (!config.groqApiKey) {
    throw new Error(
      'GROQ_API_KEY is not set. Get a free key at https://console.groq.com'
    );
  }

  const completion = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content: 'You are an expert exam paper creator. Always respond with valid JSON only. Never add markdown fences or explanatory text.',
      },
      {
        role: 'user',
        content: buildPrompt(data),
      },
    ],
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error('Groq returned an empty response');

  return parsePaperResponse(text, data);
}