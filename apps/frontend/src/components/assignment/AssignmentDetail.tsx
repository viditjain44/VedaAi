'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import {
  useAppDispatch,
  useAppSelector,
  selectAssignmentById,
  selectJobProgress,
  selectJobStatusMsg,
} from '@/store/hooks';
import { fetchAssignment, regenerateAssignment } from '@/store/assignmentSlice';
import { useWebSocket } from '@/hooks/useWebSocket';
import PaperView from '@/components/paper/PaperView';
import type { Assignment } from '@veda-ai/shared';
import toast from 'react-hot-toast';

// ─── Processing view with animated ring ──────────────────────────────────────

function ProcessingView({
  assignment,
  progress,
  statusMsg,
}: {
  assignment: Assignment;
  progress: number;
  statusMsg: string;
}) {
  const circumference = 2 * Math.PI * 28;

  const steps = [
    { label: 'Assignment queued',    pct: 5   },
    { label: 'Preparing AI prompt',  pct: 20  },
    { label: 'Generating questions', pct: 70  },
    { label: 'Structuring paper',    pct: 90  },
    { label: 'Saving to database',   pct: 100 },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-full max-w-md">

        {/* Circular progress ring */}
        <div className="flex justify-center mb-6">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32" cy="32" r="28"
                fill="none" stroke="#f4f4f5" strokeWidth="6"
              />
              <circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke="var(--brand)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress / 100)}
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[14px] font-bold text-[--text-primary]">
              {progress}%
            </span>
          </div>
        </div>

        <h2 className="text-[16px] font-semibold text-center text-[--text-primary] mb-1">
          AI is generating your paper
        </h2>
        <p className="text-[13px] text-[--text-secondary] text-center mb-1">
          {assignment.title}
        </p>
        <p className="text-[12px] text-[--brand] text-center mb-6">
          {statusMsg || 'Working…'}
        </p>

        {/* Linear progress bar */}
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden mb-7">
          <div
            className="h-full bg-gradient-to-r from-[--brand] to-orange-400 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step checklist */}
        <div className="flex flex-col gap-2.5">
          {steps.map((step, i) => {
            const done = progress >= step.pct;
            const active =
              !done && progress >= (steps[i - 1]?.pct ?? 0);

            return (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    done
                      ? 'bg-green-500'
                      : active
                      ? 'bg-[--brand]'
                      : 'bg-zinc-200'
                  }`}
                >
                  {done ? (
                    <svg viewBox="0 0 10 10" className="w-3 h-3" fill="none">
                      <path
                        d="M2 5l2.5 2.5L8 3"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <div
                      className={`w-2 h-2 rounded-full ${
                        active ? 'bg-white animate-pulse' : 'bg-zinc-300'
                      }`}
                    />
                  )}
                </div>
                <span
                  className={`text-[12px] transition-colors ${
                    done
                      ? 'text-[--text-primary] font-medium'
                      : active
                      ? 'text-[--brand] font-medium'
                      : 'text-[--text-muted]'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Failed view ──────────────────────────────────────────────────────────────

function FailedView({
  assignment,
  onRegenerate,
}: {
  assignment: Assignment;
  onRegenerate: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <AlertCircle size={40} className="text-red-400 mb-4" />
      <h2 className="text-[16px] font-semibold text-[--text-primary] mb-2">
        Generation failed
      </h2>
      <p className="text-[13px] text-[--text-secondary] text-center mb-6 max-w-sm leading-relaxed">
        {assignment.errorMessage ||
          'Something went wrong while generating the paper. Please try again.'}
      </p>
      <button
        onClick={onRegenerate}
        className="flex items-center gap-2 px-5 py-2.5 bg-[--text-primary] text-white text-[13px] font-medium rounded-full hover:bg-zinc-700 transition-colors"
      >
        <RefreshCw size={14} /> Try Again
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AssignmentDetail({ id }: { id: string }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { subscribe } = useWebSocket();

  const assignment = useAppSelector(selectAssignmentById(id));
  const progress = useAppSelector(selectJobProgress(id));
  const statusMsg = useAppSelector(selectJobStatusMsg(id));

  useEffect(() => {
    // Load assignment from API (cache-first via Redis on backend)
    dispatch(fetchAssignment(id))
      .unwrap()
      .catch(() => {
        toast.error('Assignment not found');
        router.push('/assignments');
      });

    // Subscribe to real-time WS events for this assignment
    subscribe(id);
  }, [id, dispatch, subscribe, router]);

  async function handleRegenerate() {
    const result = await dispatch(regenerateAssignment(id));
    if (regenerateAssignment.fulfilled.match(result)) {
      toast.success('Regeneration queued!');
    } else {
      toast.error((result.payload as string) || 'Failed to regenerate');
    }
  }

  // Loading state (assignment not yet in Redux store)
  if (!assignment) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[--text-muted]" />
      </div>
    );
  }

  const effectiveProgress = progress || assignment.progress || 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Back navigation */}
      <button
        onClick={() => router.push('/assignments')}
        className="flex items-center gap-1.5 text-[13px] text-[--text-secondary] hover:text-[--text-primary] mb-5 transition-colors no-print"
      >
        <ChevronLeft size={16} /> All Assignments
      </button>

      {/* Queued or processing */}
      {(assignment.status === 'queued' ||
        assignment.status === 'processing') && (
        <ProcessingView
          assignment={assignment}
          progress={effectiveProgress}
          statusMsg={statusMsg}
        />
      )}

      {/* Failed */}
      {assignment.status === 'failed' && (
        <FailedView
          assignment={assignment}
          onRegenerate={handleRegenerate}
        />
      )}

      {/* Completed — show paper */}
      {assignment.status === 'completed' && assignment.paper && (
        <PaperView
          paper={assignment.paper}
          onRegenerate={handleRegenerate}
          assignmentId={id}
        />
      )}
    </div>
  );
}
