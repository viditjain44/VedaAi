'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch } from '@/store/hooks';
import {
  wsJobQueued,
  wsJobProcessing,
  wsJobCompleted,
  wsJobFailed,
} from '@/store/assignmentSlice';
import type { WSEvent } from '@/types/shared';
import toast from 'react-hot-toast';

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000/ws';

export function useWebSocket() {
  const dispatch = useAppDispatch();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('🔌 WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSEvent = JSON.parse(event.data);
        const { assignmentId } = msg;
        if (!assignmentId) return;

        switch (msg.type) {
          case 'JOB_QUEUED':
            dispatch(
              wsJobQueued({ assignmentId, jobId: msg.jobId ?? '' })
            );
            break;

          case 'JOB_PROCESSING':
            dispatch(
              wsJobProcessing({
                assignmentId,
                progress: msg.progress ?? 30,
              })
            );
            break;

          case 'JOB_COMPLETED':
            if (msg.result) {
              dispatch(
                wsJobCompleted({ assignmentId, result: msg.result })
              );
              toast.success('✅ Paper generated successfully!');
            }
            break;

          case 'JOB_FAILED':
            dispatch(
              wsJobFailed({
                assignmentId,
                error: msg.error ?? 'Unknown error',
              })
            );
            toast.error(`Generation failed: ${msg.error}`);
            break;
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected — reconnecting in 3s…');
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, [dispatch]);

  // Subscribe to a specific assignment's events on the server
  const subscribe = useCallback((assignmentId: string) => {
    const send = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: 'SUBSCRIBE', assignmentId })
        );
      }
    };
    // If not open yet, wait for connection
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      setTimeout(send, 500);
    } else {
      send();
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { subscribe };
}
