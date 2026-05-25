import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import mongoose from 'mongoose';
import { config } from './config';
import { wsManager } from './services/websocket';
import { startWorker } from './workers/generationWorker';
import assignmentsRouter from './routes/assignments';
import pdfRouter from './routes/pdf';
import { errorHandler, notFound } from './middleware/errorHandler';

async function main(): Promise<void> {
  await mongoose.connect(config.mongodbUri);
  console.log('✅ MongoDB connected');

  const app = express();

  app.use(
    cors({
      origin: [
        'http://localhost:3000',
        'https://veda-fjn5a8zqi-viditjain44s-projects.vercel.app',
        /\.vercel\.app$/,
      ],
      credentials: true,
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    });
  });

  app.use('/api/assignments', assignmentsRouter);
  app.use('/api/assignments', pdfRouter);

  app.use(notFound);
  app.use(errorHandler);

  const server = http.createServer(app);
  wsManager.init(server);

  await startWorker();

  server.listen(config.port, () => {
    console.log(`🚀 VedaAI Backend → http://localhost:${config.port}`);
    console.log(`🔌 WebSocket      → ws://localhost:${config.port}/ws`);
    console.log(`🌍 Environment    → ${config.nodeEnv}`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});