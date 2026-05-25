// ─── Enums ────────────────────────────────────────────────────────────────────

export type QuestionType =
  | 'multiple_choice'
  | 'short_answer'
  | 'long_answer'
  | 'true_false'
  | 'fill_in_the_blank'
  | 'essay';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type AssignmentStatus =
  | 'draft'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed';

// ─── Assignment Input ─────────────────────────────────────────────────────────

export interface QuestionConfig {
  type: QuestionType;
  count: number;
  marksPerQuestion: number;
  difficulty: Difficulty;
}

export interface CreateAssignmentDto {
  title: string;
  subject: string;
  grade: string;
  dueDate: string;
  totalMarks: number;
  duration: number;
  instructions?: string;
  topic?: string;
  questionConfigs: QuestionConfig[];
  fileContent?: string;
  fileName?: string;
}

// ─── Generated Paper ──────────────────────────────────────────────────────────

export interface GeneratedQuestion {
  id: string;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  marks: number;
  options?: string[];
  expectedAnswer?: string;
}

export interface PaperSection {
  id: string;
  label: string;
  title: string;
  instruction: string;
  totalMarks: number;
  questions: GeneratedQuestion[];
}

export interface GeneratedPaper {
  id: string;
  assignmentId: string;
  title: string;
  subject: string;
  grade: string;
  duration: number;
  totalMarks: number;
  dueDate: string;
  generalInstructions: string[];
  sections: PaperSection[];
  createdAt: string;
}

// ─── Assignment Document ──────────────────────────────────────────────────────

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  grade: string;
  dueDate: string;
  totalMarks: number;
  duration: number;
  instructions?: string;
  topic?: string;
  questionConfigs: QuestionConfig[];
  fileName?: string;
  status: AssignmentStatus;
  jobId?: string;
  progress?: number;
  paper?: GeneratedPaper;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── WebSocket Events ─────────────────────────────────────────────────────────

export type WSEventType =
  | 'JOB_QUEUED'
  | 'JOB_PROCESSING'
  | 'JOB_COMPLETED'
  | 'JOB_FAILED'
  | 'SUBSCRIBE'
  | 'SUBSCRIBED'
  | 'CONNECTED';

export interface WSEvent {
  type: WSEventType;
  assignmentId: string;
  jobId?: string;
  progress?: number;
  result?: GeneratedPaper;
  error?: string;
  clientId?: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
