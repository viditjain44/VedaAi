'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Plus, X, Loader2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch } from '@/store/hooks';
import { createAssignment } from '@/store/assignmentSlice';
import type { QuestionConfig, QuestionType, Difficulty } from '@veda-ai/shared';

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'multiple_choice',   label: 'Multiple Choice Questions' },
  { value: 'short_answer',      label: 'Short Questions' },
  { value: 'long_answer',       label: 'Long Answer Questions' },
  { value: 'true_false',        label: 'True / False' },
  { value: 'fill_in_the_blank', label: 'Fill in the Blank' },
  { value: 'essay',             label: 'Essay Questions' },
];

const GRADES = [
  'Class 1','Class 2','Class 3','Class 4','Class 5',
  'Class 6','Class 7','Class 8','Class 9','Class 10',
  'Class 11','Class 12',
];

interface FormState {
  title: string;
  subject: string;
  grade: string;
  dueDate: string;
  totalMarks: string;
  duration: string;
  topic: string;
  instructions: string;
  questionConfigs: QuestionConfig[];
}

type FormErrors = Partial<Record<string, string>>;

function defaultConfig(): QuestionConfig {
  return { type: 'multiple_choice', count: 4, marksPerQuestion: 1, difficulty: 'medium' };
}

function Stepper({ value, onChange, min = 1 }: {
  value: number; onChange: (v: number) => void; min?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <button type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-7 h-7 rounded-full border border-[--border] flex items-center justify-center text-[--text-secondary] hover:bg-zinc-50 text-lg leading-none">
        −
      </button>
      <span className="w-5 text-center text-[13px] font-medium text-[--text-primary]">{value}</span>
      <button type="button"
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-full border border-[--border] flex items-center justify-center text-[--text-secondary] hover:bg-zinc-50 text-lg leading-none">
        +
      </button>
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full px-3 py-2.5 text-[13px] bg-white border rounded-lg outline-none transition-colors ${
    hasError ? 'border-red-400' : 'border-[--border] focus:border-zinc-400'
  }`;
}

export default function CreateAssignmentForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const [form, setForm] = useState<FormState>({
    title: '',
    subject: '',
    grade: '',
    dueDate: '',
    totalMarks: '',
    duration: '60',
    topic: '',
    instructions: '',
    questionConfigs: [defaultConfig()],
  });

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setUploadedFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    onDropRejected: () => toast.error('File too large or unsupported type'),
  });

  const setField = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const updateConfig = (idx: number, key: keyof QuestionConfig, value: unknown) => {
    setForm((f) => {
      const configs = [...f.questionConfigs];
      configs[idx] = { ...configs[idx], [key]: value };
      return { ...f, questionConfigs: configs };
    });
  };

  const addSection = () => {
    if (form.questionConfigs.length >= 6) return void toast.error('Max 6 sections');
    setForm((f) => ({ ...f, questionConfigs: [...f.questionConfigs, defaultConfig()] }));
  };

  const removeSection = (idx: number) => {
    if (form.questionConfigs.length === 1) return;
    setForm((f) => ({ ...f, questionConfigs: f.questionConfigs.filter((_, i) => i !== idx) }));
  };

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.title.trim())   errs.title = 'Required';
    if (!form.subject.trim()) errs.subject = 'Required';
    if (!form.grade)          errs.grade = 'Required';
    if (!form.dueDate)        errs.dueDate = 'Required';
    const marks = Number(form.totalMarks);
    if (!form.totalMarks || isNaN(marks) || marks <= 0) errs.totalMarks = 'Must be positive';
    const dur = Number(form.duration);
    if (!form.duration || isNaN(dur) || dur <= 0) errs.duration = 'Must be positive';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const result = await dispatch(createAssignment({
        dto: {
          title: form.title.trim(),
          subject: form.subject.trim(),
          grade: form.grade,
          dueDate: form.dueDate,
          totalMarks: Number(form.totalMarks),
          duration: Number(form.duration),
          topic: form.topic.trim() || undefined,
          instructions: form.instructions.trim() || undefined,
          questionConfigs: form.questionConfigs,
        },
        file: uploadedFile ?? undefined,
      }));
      if (createAssignment.fulfilled.match(result)) {
        toast.success('Assignment created! Generating paper…');
        router.push(`/assignments/${result.payload.id}`);
      } else {
        toast.error((result.payload as string) || 'Failed to create');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const totalQuestions = form.questionConfigs.reduce((s, c) => s + c.count, 0);
  const totalMarksComputed = form.questionConfigs.reduce(
    (s, c) => s + c.count * c.marksPerQuestion, 0
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
        <h1 className="text-[16px] font-semibold text-[--text-primary]">Create Assignment</h1>
      </div>
      <p className="text-[12px] text-[--text-secondary] mb-6 ml-4">
        Set up a new assignment for your students.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-2xl border border-[--border] overflow-hidden">
          <div className="px-6 py-4 border-b border-[--border]">
            <h2 className="text-[14px] font-semibold text-[--text-primary]">Assignment Details</h2>
            <p className="text-[12px] text-[--text-secondary]">Basic information about your assignment</p>
          </div>

          <div className="px-6 py-5 flex flex-col gap-4">

            {/* File upload */}
            <div {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-[--brand] bg-[--brand-light]'
                  : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50'
              }`}>
              <input {...getInputProps()} />
              {uploadedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-[13px] text-[--text-primary] font-medium">{uploadedFile.name}</span>
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                    className="text-[--text-muted] hover:text-red-500">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={22} className="mx-auto mb-2 text-[--text-muted]" />
                  <p className="text-[13px] text-[--text-secondary]">
                    Choose a file or drag & drop it here
                  </p>
                  <p className="text-[11px] text-[--text-muted] mt-1">JPEG, PNG, PDF, upto 10MB</p>
                  <button type="button"
                    className="mt-3 px-4 py-1.5 border border-[--border] rounded-lg text-[12px] text-[--text-secondary] bg-white hover:bg-zinc-50">
                    Browse Files
                  </button>
                  <p className="text-[11px] text-[--text-muted] mt-2">
                    Upload images of your preferred document/image
                  </p>
                </>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-[12px] font-medium text-[--text-secondary] mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input type="text" placeholder="e.g. Mid-Term Exam – Electricity"
                value={form.title} onChange={(e) => setField('title', e.target.value)}
                className={inputCls(!!errors.title)} />
              {errors.title && <p className="text-[11px] text-red-500 mt-1">{errors.title}</p>}
            </div>

            {/* Subject + Grade */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-[--text-secondary] mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input type="text" placeholder="e.g. Science"
                  value={form.subject} onChange={(e) => setField('subject', e.target.value)}
                  className={inputCls(!!errors.subject)} />
                {errors.subject && <p className="text-[11px] text-red-500 mt-1">{errors.subject}</p>}
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[--text-secondary] mb-1">
                  Grade <span className="text-red-500">*</span>
                </label>
                <select value={form.grade} onChange={(e) => setField('grade', e.target.value)}
                  className={inputCls(!!errors.grade)}>
                  <option value="">Select class</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                {errors.grade && <p className="text-[11px] text-red-500 mt-1">{errors.grade}</p>}
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-[12px] font-medium text-[--text-secondary] mb-1">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input type="date" value={form.dueDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setField('dueDate', e.target.value)}
                className={inputCls(!!errors.dueDate)} />
              {errors.dueDate && <p className="text-[11px] text-red-500 mt-1">{errors.dueDate}</p>}
            </div>

            {/* Total Marks + Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-[--text-secondary] mb-1">
                  Total Marks <span className="text-red-500">*</span>
                </label>
                <input type="number" min="1" placeholder="60"
                  value={form.totalMarks} onChange={(e) => setField('totalMarks', e.target.value)}
                  className={inputCls(!!errors.totalMarks)} />
                {errors.totalMarks && <p className="text-[11px] text-red-500 mt-1">{errors.totalMarks}</p>}
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[--text-secondary] mb-1">
                  Duration (min) <span className="text-red-500">*</span>
                </label>
                <input type="number" min="1" placeholder="60"
                  value={form.duration} onChange={(e) => setField('duration', e.target.value)}
                  className={inputCls(!!errors.duration)} />
                {errors.duration && <p className="text-[11px] text-red-500 mt-1">{errors.duration}</p>}
              </div>
            </div>

            {/* Topic */}
            <div>
              <label className="block text-[12px] font-medium text-[--text-secondary] mb-1">
                Topic / Chapter <span className="text-[--text-muted] font-normal">(optional)</span>
              </label>
              <input type="text" placeholder="e.g. Electricity, Chapter 12"
                value={form.topic} onChange={(e) => setField('topic', e.target.value)}
                className={inputCls(false)} />
            </div>

            {/* Question Types with steppers */}
            <div>
              <div className="grid grid-cols-3 text-[11px] font-semibold text-[--text-secondary] uppercase tracking-wide px-1 mb-2">
                <span>Question Type</span>
                <span className="text-center">No. of Questions</span>
                <span className="text-center">Marks</span>
              </div>

              <div className="flex flex-col gap-2">
                {form.questionConfigs.map((cfg, idx) => (
                  <div key={idx}
                    className="grid grid-cols-3 items-center gap-2 p-3 border border-[--border] rounded-xl bg-zinc-50/50">
                    <div className="flex items-center gap-1">
                      <select value={cfg.type}
                        onChange={(e) => updateConfig(idx, 'type', e.target.value as QuestionType)}
                        className="flex-1 text-[12px] border border-[--border] rounded-lg px-2 py-1.5 outline-none bg-white">
                        {QUESTION_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => removeSection(idx)}
                        className="text-[--text-muted] hover:text-red-500 transition-colors ml-1 flex-shrink-0">
                        <X size={13} />
                      </button>
                    </div>
                    <div className="flex justify-center">
                      <Stepper value={cfg.count}
                        onChange={(v) => updateConfig(idx, 'count', v)} />
                    </div>
                    <div className="flex justify-center">
                      <Stepper value={cfg.marksPerQuestion}
                        onChange={(v) => updateConfig(idx, 'marksPerQuestion', v)} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Question Type */}
              <button type="button" onClick={addSection}
                className="flex items-center gap-2 mt-3 text-[13px] text-[--text-secondary] hover:text-[--text-primary] transition-colors">
                <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center">
                  <Plus size={13} />
                </div>
                Add Question Type
              </button>

              {/* Totals */}
              <div className="flex justify-end gap-6 mt-3 text-[13px] text-[--text-secondary]">
                <span>Total Questions : <strong className="text-[--text-primary]">{totalQuestions}</strong></span>
                <span>Total Marks : <strong className="text-[--text-primary]">{totalMarksComputed}</strong></span>
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-[12px] font-medium text-[--text-secondary] mb-2">
                Overall Difficulty
              </label>
              <div className="flex gap-2">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                  <button key={d} type="button"
                    onClick={() => setForm((f) => ({
                      ...f,
                      questionConfigs: f.questionConfigs.map((c) => ({ ...c, difficulty: d })),
                    }))}
                    className={`px-4 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                      form.questionConfigs.every((c) => c.difficulty === d)
                        ? d === 'easy'
                          ? 'bg-green-100 text-green-700 border-green-300'
                          : d === 'hard'
                          ? 'bg-red-100 text-red-700 border-red-300'
                          : 'bg-amber-100 text-amber-700 border-amber-300'
                        : 'bg-white text-[--text-secondary] border-[--border] hover:bg-zinc-50'
                    }`}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Instructions */}
            <div>
              <label className="block text-[12px] font-medium text-[--text-secondary] mb-1">
                Additional Information{' '}
                <span className="text-[--text-muted] font-normal">(For better output)</span>
              </label>
              <textarea
                placeholder="e.g. Generate a question paper for 3 hour exam duration…"
                value={form.instructions}
                onChange={(e) => setField('instructions', e.target.value)}
                rows={3}
                className={`${inputCls(false)} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Previous / Next */}
        <div className="flex items-center justify-between mt-5">
          <button type="button" onClick={() => router.back()}
            className="flex items-center gap-2 px-6 py-2.5 border border-[--border] rounded-full text-[13px] text-[--text-secondary] bg-white hover:bg-zinc-50 transition-colors">
            ← Previous
          </button>
          <button type="submit" disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-[--text-primary] text-white rounded-full text-[13px] font-medium hover:bg-zinc-700 disabled:opacity-60 transition-colors">
            {isSubmitting
              ? <><Loader2 size={14} className="animate-spin" /> Creating…</>
              : 'Next →'}
          </button>
        </div>
      </form>
    </div>
  );
}