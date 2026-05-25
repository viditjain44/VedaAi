import { Worker, Job } from 'bullmq';
import mongoose from 'mongoose';
import {
  getRedisClient,
  cacheSet,
  cacheDel,
  CACHE_KEYS,
} from '../config/redis';
import { config } from '../config';
import { GENERATION_QUEUE, type GenerationJobData } from '../services/queue';
import { generatePaper } from '../services/aiService';
import { wsManager } from '../services/websocket';
import { AssignmentModel } from '../models/Assignment';

async function connectDB(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(config.mongodbUri);
    console.log('✅ Worker: MongoDB connected');
  }
}

async function processGenerationJob(
  job: Job<GenerationJobData>
): Promise<void> {
  const { assignmentId } = job.data;
  console.log(`🔧 Processing job ${job.id} for assignment ${assignmentId}`);

  // ── Step 1: mark processing ──────────────────────────────────────────────
  await AssignmentModel.findByIdAndUpdate(assignmentId, {
    status: 'processing',
    progress: 10,
  });
  await cacheDel(CACHE_KEYS.assignment(assignmentId));
  await cacheDel(CACHE_KEYS.assignments());

  wsManager.notifyAssignment(assignmentId, {
    type: 'JOB_PROCESSING',
    jobId: job.id!,
    progress: 10,
  });

  // ── Step 2: build prompt progress ────────────────────────────────────────
  await job.updateProgress(30);
  await AssignmentModel.findByIdAndUpdate(assignmentId, { progress: 30 });
  wsManager.notifyAssignment(assignmentId, {
    type: 'JOB_PROCESSING',
    jobId: job.id!,
    progress: 30,
  });

  // ── Step 3: call Claude AI ───────────────────────────────────────────────
  const paper = await generatePaper(job.data);

  // ── Step 4: saving ───────────────────────────────────────────────────────
  await job.updateProgress(85);
  await AssignmentModel.findByIdAndUpdate(assignmentId, { progress: 85 });
  wsManager.notifyAssignment(assignmentId, {
    type: 'JOB_PROCESSING',
    jobId: job.id!,
    progress: 85,
  });

  // ── Step 5: persist to DB ────────────────────────────────────────────────
  const updated = await AssignmentModel.findByIdAndUpdate(
    assignmentId,
    {
      status: 'completed',
      progress: 100,
      paper,
      errorMessage: undefined,
    },
    { new: true }
  );

  if (updated) {
    await cacheSet(CACHE_KEYS.assignment(assignmentId), updated.toJSON(), 3600);
    await cacheSet(CACHE_KEYS.paper(assignmentId), paper, 3600);
    await cacheDel(CACHE_KEYS.assignments());
  }

  // ── Step 6: notify frontend ──────────────────────────────────────────────
  wsManager.notifyAssignment(assignmentId, {
    type: 'JOB_COMPLETED',
    jobId: job.id!,
    progress: 100,
    result: paper,
  });

  console.log(`✅ Job ${job.id} completed for assignment ${assignmentId}`);
}

export async function startWorker(): Promise<Worker> {
  await connectDB();

  const worker = new Worker<GenerationJobData>(
    GENERATION_QUEUE,
    processGenerationJob,
    {
      connection: getRedisClient(),
      concurrency: 3,
    }
  );

  worker.on('failed', async (job, err) => {
    if (!job) return;
    const { assignmentId } = job.data;
    console.error(`❌ Job ${job.id} failed:`, err.message);

    await AssignmentModel.findByIdAndUpdate(assignmentId, {
      status: 'failed',
      errorMessage: err.message,
      progress: 0,
    });
    await cacheDel(CACHE_KEYS.assignment(assignmentId));
    await cacheDel(CACHE_KEYS.assignments());

    wsManager.notifyAssignment(assignmentId, {
      type: 'JOB_FAILED',
      jobId: job.id!,
      error: err.message,
    });
  });

  worker.on('error', (err) => {
    console.error('BullMQ worker error:', err);
  });

  console.log('✅ BullMQ worker started (concurrency: 3)');
  return worker;
}
