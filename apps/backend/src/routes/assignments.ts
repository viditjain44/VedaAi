import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { AssignmentModel } from '../models/Assignment';
import {
  getGenerationQueue,
  type GenerationJobData,
} from '../services/queue';
import { wsManager } from '../services/websocket';
import {
  cacheGet,
  cacheSet,
  cacheDel,
  CACHE_KEYS,
} from '../config/redis';
import { config } from '../config';
import type { Assignment, ApiResponse } from '@veda-ai/shared';

const router = Router();

// ─── Multer ───────────────────────────────────────────────────────────────────

const uploadDir = path.resolve(config.uploadDir);
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSize },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF and TXT files are allowed'));
  },
});

// ─── Validation ───────────────────────────────────────────────────────────────

const QuestionConfigSchema = z.object({
  type: z.enum([
    'multiple_choice',
    'short_answer',
    'long_answer',
    'true_false',
    'fill_in_the_blank',
    'essay',
  ]),
  count: z.number().int().min(1).max(50),
  marksPerQuestion: z.number().min(0.5).max(100),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

const CreateAssignmentSchema = z.object({
  title: z.string().min(1).max(200),
  subject: z.string().min(1).max(100),
  grade: z.string().min(1).max(50),
  dueDate: z.string().min(1),
  totalMarks: z.number().min(1).max(1000),
  duration: z.number().int().min(1).max(600),
  instructions: z.string().optional(),
  topic: z.string().optional(),
  questionConfigs: z.array(QuestionConfigSchema).min(1).max(10),
});

// ─── File content extractor ───────────────────────────────────────────────────

async function extractFileContent(
  filePath: string,
  mimetype: string
): Promise<string> {
  if (mimetype === 'application/pdf' || filePath.endsWith('.pdf')) {
    try {
      const pdfParse = await import('pdf-parse');
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse.default(buffer);
      return data.text.slice(0, 3000);
    } catch {
      return '';
    }
  }
  return fs.readFileSync(filePath, 'utf-8').slice(0, 3000);
}

// ─── GET /api/assignments ─────────────────────────────────────────────────────

router.get('/', async (_req: Request, res: Response) => {
  try {
    const cached = await cacheGet<Assignment[]>(CACHE_KEYS.assignments());
    if (cached) {
      return res.json({ success: true, data: cached } as ApiResponse<Assignment[]>);
    }

    const assignments = await AssignmentModel.find()
      .sort({ createdAt: -1 })
      .lean();

    const data = assignments.map((a) => ({
      ...a,
      id: (a._id as mongoose.Types.ObjectId).toString(),
    }));

    await cacheSet(CACHE_KEYS.assignments(), data, 60);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('List error:', err);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch assignments' });
  }
});

// ─── GET /api/assignments/:id ─────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const cached = await cacheGet<Assignment>(CACHE_KEYS.assignment(id));
    if (cached) return res.json({ success: true, data: cached });

    const assignment = await AssignmentModel.findById(id).lean();
    if (!assignment)
      return res
        .status(404)
        .json({ success: false, error: 'Assignment not found' });

    const data = {
      ...assignment,
      id: (assignment._id as mongoose.Types.ObjectId).toString(),
    };
    await cacheSet(CACHE_KEYS.assignment(id), data, 300);
    return res.json({ success: true, data });
  } catch {
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch assignment' });
  }
});

// ─── POST /api/assignments ────────────────────────────────────────────────────

router.post(
  '/',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      // Parse body (multipart sends everything as strings)
      const body = { ...req.body };
      if (typeof body.questionConfigs === 'string') {
        body.questionConfigs = JSON.parse(body.questionConfigs);
      }
      if (typeof body.totalMarks === 'string')
        body.totalMarks = parseFloat(body.totalMarks);
      if (typeof body.duration === 'string')
        body.duration = parseInt(body.duration, 10);

      const parsed = CreateAssignmentSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          data: parsed.error.flatten().fieldErrors,
        });
      }

      const dto = parsed.data;

      // Extract file content
      let fileContent: string | undefined;
      let fileName: string | undefined;
      if (req.file) {
        fileContent = await extractFileContent(
          req.file.path,
          req.file.mimetype
        );
        fileName = req.file.originalname;
      }

      // Create assignment
      const assignment = await AssignmentModel.create({
        ...dto,
        fileName,
        status: 'queued',
        progress: 0,
      });

      const assignmentId = assignment._id.toString();

      // Queue job
      const queue = getGenerationQueue();
      const jobData: GenerationJobData = {
        assignmentId,
        title: dto.title,
        subject: dto.subject,
        grade: dto.grade,
        topic: dto.topic,
        instructions: dto.instructions,
        dueDate: dto.dueDate,
        totalMarks: dto.totalMarks,
        duration: dto.duration,
        questionConfigs: dto.questionConfigs,
        fileContent,
      };

      const job = await queue.add('generate-paper', jobData, {
        jobId: `gen-${assignmentId}`,
      });

      await AssignmentModel.findByIdAndUpdate(assignmentId, {
        jobId: job.id,
      });
      await cacheDel(CACHE_KEYS.assignments());

      // Notify
      wsManager.notifyAssignment(assignmentId, {
        type: 'JOB_QUEUED',
        jobId: job.id!,
        progress: 0,
      });

      return res.status(201).json({
        success: true,
        data: assignment.toJSON(),
        message: 'Assignment created and queued for AI generation',
      });
    } catch (err) {
      console.error('Create error:', err);
      return res
        .status(500)
        .json({ success: false, error: 'Failed to create assignment' });
    }
  }
);

// ─── POST /api/assignments/:id/regenerate ─────────────────────────────────────

router.post('/:id/regenerate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const assignment = await AssignmentModel.findById(id);
    if (!assignment)
      return res.status(404).json({ success: false, error: 'Not found' });

    await AssignmentModel.findByIdAndUpdate(id, {
      status: 'queued',
      progress: 0,
      paper: undefined,
      errorMessage: undefined,
    });

    await cacheDel(CACHE_KEYS.assignment(id));
    await cacheDel(CACHE_KEYS.assignments());
    await cacheDel(CACHE_KEYS.paper(id));

    const queue = getGenerationQueue();
    const jobData: GenerationJobData = {
      assignmentId: id,
      title: assignment.title,
      subject: assignment.subject,
      grade: assignment.grade,
      topic: assignment.topic,
      instructions: assignment.instructions,
      dueDate: assignment.dueDate,
      totalMarks: assignment.totalMarks,
      duration: assignment.duration,
      questionConfigs: assignment.questionConfigs,
    };

    const job = await queue.add('generate-paper', jobData, {
      jobId: `regen-${id}-${Date.now()}`,
    });

    await AssignmentModel.findByIdAndUpdate(id, { jobId: job.id });
    wsManager.notifyAssignment(id, {
      type: 'JOB_QUEUED',
      jobId: job.id!,
      progress: 0,
    });

    return res.json({ success: true, message: 'Regeneration queued' });
  } catch {
    return res
      .status(500)
      .json({ success: false, error: 'Failed to regenerate' });
  }
});

// ─── GET /api/assignments/:id/result ─────────────────────────────────────────

router.get('/:id/result', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const cached = await cacheGet(CACHE_KEYS.paper(id));
    if (cached) return res.json({ success: true, data: cached });

    const assignment = await AssignmentModel.findById(id).lean();
    if (!assignment)
      return res.status(404).json({ success: false, error: 'Not found' });
    if (!assignment.paper)
      return res
        .status(404)
        .json({ success: false, error: 'Paper not yet generated' });

    await cacheSet(CACHE_KEYS.paper(id), assignment.paper, 3600);
    return res.json({ success: true, data: assignment.paper });
  } catch {
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch result' });
  }
});

// ─── DELETE /api/assignments/:id ──────────────────────────────────────────────

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await AssignmentModel.findByIdAndDelete(id);
    await cacheDel(CACHE_KEYS.assignment(id));
    await cacheDel(CACHE_KEYS.assignments());
    await cacheDel(CACHE_KEYS.paper(id));
    return res.json({ success: true, message: 'Assignment deleted' });
  } catch {
    return res
      .status(500)
      .json({ success: false, error: 'Failed to delete assignment' });
  }
});

export default router;
