import { Queue } from 'bullmq';
import { getRedisClient } from '../config/redis';

export interface GenerationJobData {
  assignmentId: string;
  title: string;
  subject: string;
  grade: string;
  topic?: string;
  instructions?: string;
  dueDate: string;
  totalMarks: number;
  duration: number;
  questionConfigs: Array<{
    type: string;
    count: number;
    marksPerQuestion: number;
    difficulty: string;
  }>;
  fileContent?: string;
}

export const GENERATION_QUEUE = 'paper-generation';

let generationQueue: Queue | null = null;

export function getGenerationQueue(): Queue {
  if (!generationQueue) {
    generationQueue = new Queue(GENERATION_QUEUE, {
      connection: getRedisClient(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });
    console.log('✅ BullMQ queue initialized:', GENERATION_QUEUE);
  }
  return generationQueue;
}
