import mongoose, { Document, Schema } from 'mongoose';
import type {
  Assignment,
  QuestionConfig,
  GeneratedPaper,
} from '@veda-ai/shared';

export interface AssignmentDocument
  extends Omit<Assignment, 'id'>,
    Document {}

const QuestionConfigSchema = new Schema<QuestionConfig>({
  type: { type: String, required: true },
  count: { type: Number, required: true, min: 1 },
  marksPerQuestion: { type: Number, required: true, min: 0.5 },
  difficulty: {
    type: String,
    required: true,
    enum: ['easy', 'medium', 'hard'],
  },
});

const GeneratedQuestionSchema = new Schema({
  id: String,
  text: String,
  type: String,
  difficulty: String,
  marks: Number,
  options: [String],
  expectedAnswer: String,
});

const PaperSectionSchema = new Schema({
  id: String,
  label: String,
  title: String,
  instruction: String,
  totalMarks: Number,
  questions: [GeneratedQuestionSchema],
});

const GeneratedPaperSchema = new Schema<GeneratedPaper>({
  id: String,
  assignmentId: String,
  title: String,
  subject: String,
  grade: String,
  duration: Number,
  totalMarks: Number,
  dueDate: String,
  generalInstructions: [String],
  sections: [PaperSectionSchema],
  createdAt: String,
});

const AssignmentSchema = new Schema<AssignmentDocument>(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    grade: { type: String, required: true },
    dueDate: { type: String, required: true },
    totalMarks: { type: Number, required: true, min: 1 },
    duration: { type: Number, required: true, min: 1 },
    instructions: { type: String },
    topic: { type: String },
    questionConfigs: { type: [QuestionConfigSchema], required: true },
    fileName: { type: String },
    status: {
      type: String,
      enum: ['draft', 'queued', 'processing', 'completed', 'failed'],
      default: 'draft',
    },
    jobId: { type: String },
    progress: { type: Number, default: 0 },
    paper: { type: GeneratedPaperSchema },
    errorMessage: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const AssignmentModel = mongoose.model<AssignmentDocument>(
  'Assignment',
  AssignmentSchema
);
