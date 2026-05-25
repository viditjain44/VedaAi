'use client';
import { useState } from 'react';
import { Download, RefreshCw, Printer, BookOpen, Loader2 } from 'lucide-react';
import { assignmentsApi } from '@/lib/api';
import type { GeneratedPaper, GeneratedQuestion } from '@/types/shared';
function DifficultyBadge({ difficulty }: { difficulty: GeneratedQuestion['difficulty'] }) {
  const map = {
    easy:   { label: 'Easy',     cls: 'badge-easy'   },
    medium: { label: 'Moderate', cls: 'badge-medium' },
    hard:   { label: 'Hard',     cls: 'badge-hard'   },
  };
  const { label, cls } = map[difficulty] ?? map.medium;
  return (
    <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

function QuestionItem({ question, index }: { question: GeneratedQuestion; index: number }) {
  return (
    <div className="flex gap-3 py-3 border-b border-zinc-100 last:border-0">
      <span className="text-[13px] font-semibold text-[--text-secondary] min-w-[22px] pt-0.5">
        {index + 1}.
      </span>
      <div className="flex-1">
        <p className="text-[13px] text-[--text-primary] leading-relaxed">{question.text}</p>

        {question.options && question.options.length > 0 && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
            {question.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px] text-[--text-secondary]">
                <span className="w-5 h-5 rounded-full border border-zinc-300 flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt.replace(/^[A-D]\.\s*/, '')}
              </div>
            ))}
          </div>
        )}

        {question.type === 'true_false' && !question.options && (
          <div className="flex gap-5 mt-2">
            {['True', 'False'].map((o) => (
              <div key={o} className="flex items-center gap-2 text-[12px] text-[--text-secondary]">
                <span className="w-4 h-4 rounded-full border-2 border-zinc-300 inline-block" />
                {o}
              </div>
            ))}
          </div>
        )}

        {(question.type === 'short_answer' || question.type === 'fill_in_the_blank') && (
          <div className="mt-2 h-7 border-b-2 border-dashed border-zinc-200 w-full" />
        )}

        {(question.type === 'long_answer' || question.type === 'essay') && (
          <div className="mt-2 flex flex-col gap-1.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-6 border-b border-dashed border-zinc-200 w-full" />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mt-2">
          <DifficultyBadge difficulty={question.difficulty} />
          <span className="text-[11px] text-[--text-muted]">
            [{question.marks} {question.marks === 1 ? 'Mark' : 'Marks'}]
          </span>
        </div>
      </div>
    </div>
  );
}

function ActionBar({ assignmentId, onRegenerate }: {
  assignmentId: string; onRegenerate: () => void;
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadPDF() {
    setDownloading(true);
    try {
      const url = assignmentsApi.getPdfUrl(assignmentId);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'question_paper.pdf';
      a.click();
    } catch {
      window.print();
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap no-print">
      <button onClick={onRegenerate}
        className="flex items-center gap-1.5 px-3.5 py-2 border border-[--border] rounded-lg text-[12px] text-[--text-secondary] hover:bg-zinc-50 transition-colors">
        <RefreshCw size={13} /> Regenerate
      </button>
      <button onClick={() => window.print()}
        className="flex items-center gap-1.5 px-3.5 py-2 border border-[--border] rounded-lg text-[12px] text-[--text-secondary] hover:bg-zinc-50 transition-colors">
        <Printer size={13} /> Print
      </button>
      <button onClick={handleDownloadPDF} disabled={downloading}
        className="flex items-center gap-1.5 px-4 py-2 bg-[--text-primary] text-white rounded-lg text-[12px] font-medium hover:bg-zinc-700 disabled:opacity-60 transition-colors">
        {downloading
          ? <><Loader2 size={13} className="animate-spin" /> Preparing…</>
          : <><Download size={13} /> Download as PDF</>}
      </button>
    </div>
  );
}

export default function PaperView({ paper, onRegenerate, assignmentId }: {
  paper: GeneratedPaper; onRegenerate: () => void; assignmentId: string;
}) {
  const formattedDate = new Date(paper.dueDate).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const answerKeyItems = paper.sections.flatMap((section) =>
    section.questions.filter((q) => q.expectedAnswer)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5 no-print">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-[--brand]" />
          <span className="text-[14px] font-semibold text-[--text-primary]">Generated Paper</span>
          <span className="text-[11px] text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-medium">
            ✓ Ready
          </span>
        </div>
        <ActionBar assignmentId={assignmentId} onRegenerate={onRegenerate} />
      </div>

      <div id="paper-content"
        className="bg-white border border-[--border] rounded-2xl overflow-hidden shadow-card">

        {/* School header matching Figma */}
        <div className="border-b-2 border-[--text-primary] px-8 py-5 text-center">
          <h1 className="text-[18px] font-bold text-[--text-primary]">
            Delhi Public School, Sector-4, Bokaro
          </h1>
          <p className="text-[13px] text-[--text-secondary] mt-1">
            Subject: <strong className="text-[--text-primary]">{paper.subject}</strong>
          </p>
          <p className="text-[13px] text-[--text-secondary]">
            Class: <strong className="text-[--text-primary]">{paper.grade}</strong>
          </p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 text-[12px] text-[--text-secondary] max-w-lg mx-auto">
            <span>Time Allowed: <strong className="text-[--text-primary]">{paper.duration} minutes</strong></span>
            <span>Maximum Marks: <strong className="text-[--text-primary]">{paper.totalMarks}</strong></span>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-6 flex flex-col gap-6">

          {paper.generalInstructions.length > 0 && (
            <p className="text-[12px] text-[--text-secondary] italic">
              {paper.generalInstructions[0]}
            </p>
          )}

          {/* Student Info */}
          <div className="flex flex-col gap-3">
            {['Name', 'Roll Number', 'Class', 'Section'].map((lbl) => (
              <div key={lbl} className="flex items-center gap-2">
                <label className="text-[12px] text-[--text-secondary] w-24 flex-shrink-0">{lbl}:</label>
                <div className="flex-1 border-b border-zinc-300 h-6" />
              </div>
            ))}
          </div>

          {/* Sections */}
          {paper.sections.map((section) => (
            <div key={section.id}>
              <div className="mb-3">
                <h2 className="text-[14px] font-bold text-[--text-primary]">
                  {section.label} — {section.title}
                </h2>
                <p className="text-[12px] text-[--text-secondary] italic mt-0.5">
                  {section.instruction}
                </p>
              </div>
              <div className="divide-y divide-zinc-100">
                {section.questions.map((q, idx) => (
                  <QuestionItem key={q.id} question={q} index={idx} />
                ))}
              </div>
            </div>
          ))}

          {/* End of paper */}
          <div className="text-center py-2 border-t border-zinc-100">
            <p className="text-[12px] font-medium text-[--text-secondary]">
              End of Question Paper
            </p>
          </div>

          {/* Answer Key matching Figma */}
          {answerKeyItems.length > 0 && (
            <div>
              <h3 className="text-[14px] font-bold text-[--text-primary] mb-3">Answer Key :</h3>
              <div className="flex flex-col gap-1.5">
                {answerKeyItems.map((q, idx) => (
                  <p key={q.id} className="text-[12px] text-[--text-secondary] flex gap-2">
                    <strong className="text-[--text-primary] min-w-[20px]">{idx + 1}.</strong>
                    <span>{q.expectedAnswer}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}