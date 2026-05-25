'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Plus, RefreshCw, Loader2, CheckCircle2, AlertCircle,
  MoreVertical, Filter, Search,
} from 'lucide-react';
import {
  useAppDispatch, useAppSelector,
  selectAllAssignments, selectAssignmentsStatus,
  selectAssignmentsError, selectJobProgress,
} from '@/store/hooks';
import { fetchAssignments, deleteAssignment } from '@/store/assignmentSlice';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { Assignment } from '@veda-ai/shared';

function StatusBadge({ status, progress }: { status: Assignment['status']; progress?: number }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft:      { label: 'Draft',             cls: 'bg-zinc-100 text-zinc-600' },
    queued:     { label: 'Queued',            cls: 'bg-blue-50 text-blue-600' },
    processing: { label: `${progress ?? 0}%`, cls: 'bg-amber-50 text-amber-600' },
    completed:  { label: 'Completed',         cls: 'bg-green-50 text-green-700' },
    failed:     { label: 'Failed',            cls: 'bg-red-50 text-red-600' },
  };
  const { label, cls } = map[status] ?? map.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>
      {status === 'processing' && <Loader2 size={10} className="animate-spin" />}
      {status === 'completed'  && <CheckCircle2 size={10} />}
      {status === 'failed'     && <AlertCircle size={10} />}
      {label}
    </span>
  );
}

function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const dispatch = useAppDispatch();
  const progress = useAppSelector(selectJobProgress(assignment.id));
  const effectiveProgress = progress || assignment.progress || 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const assignedDate = new Date(assignment.createdAt)
    .toLocaleDateString('en-GB').replace(/\//g, '-');
  const dueDate = new Date(assignment.dueDate)
    .toLocaleDateString('en-GB').replace(/\//g, '-');

  return (
    <div className="bg-white rounded-xl border border-[--border] p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-[--text-primary] truncate">
            {assignment.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={assignment.status} progress={effectiveProgress} />
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.preventDefault(); setMenuOpen(!menuOpen); }}
              className="p-1 rounded-lg hover:bg-zinc-100 transition-colors">
              <MoreVertical size={15} className="text-[--text-muted]" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 bg-white border border-[--border] rounded-xl shadow-lg z-20 min-w-[150px] overflow-hidden">
                <Link href={`/assignments/${assignment.id}`}
                  className="block px-4 py-2.5 text-[13px] text-[--text-primary] hover:bg-zinc-50 transition-colors"
                  onClick={() => setMenuOpen(false)}>
                  View Assignment
                </Link>
                <button
                  onClick={() => { dispatch(deleteAssignment(assignment.id)); setMenuOpen(false); }}
                  className="block w-full text-left px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-50 transition-colors">
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {(assignment.status === 'processing' || assignment.status === 'queued') && (
        <div className="mt-2">
          <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-[--brand] rounded-full transition-all duration-500 progress-pulse"
              style={{ width: `${effectiveProgress}%` }} />
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mt-3 text-[12px] text-[--text-secondary]">
        <span>Assigned on : <strong className="text-[--text-primary]">{assignedDate}</strong></span>
        <span>Due : <strong className="text-[--text-primary]">{dueDate}</strong></span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
      <div className="relative w-44 h-44 mb-6">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="100" cy="110" r="70" fill="#EDEDF0" />
          <rect x="58" y="52" width="92" height="114" rx="8" fill="white" stroke="#E4E4E7" strokeWidth="1.5" />
          <rect x="70" y="70" width="52" height="4" rx="2" fill="#D4D4D8" />
          <rect x="70" y="82" width="68" height="3" rx="1.5" fill="#E4E4E7" />
          <rect x="70" y="91" width="60" height="3" rx="1.5" fill="#E4E4E7" />
          <rect x="70" y="100" width="64" height="3" rx="1.5" fill="#E4E4E7" />
          <circle cx="120" cy="120" r="29" fill="white" stroke="#D4D4D8" strokeWidth="2" />
          <circle cx="120" cy="120" r="21" fill="#F9F9FA" />
          <line x1="113" y1="113" x2="127" y2="127" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
          <line x1="127" y1="113" x2="113" y2="127" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
          <line x1="141" y1="139" x2="155" y2="153" stroke="#C4C4C8" strokeWidth="5" strokeLinecap="round" />
          <circle cx="53" cy="94" r="4" fill="#BFDBFE" />
          <circle cx="163" cy="142" r="3" fill="#6366F1" opacity="0.5" />
          <path d="M56 138 L58 132 L60 138 L66 140 L60 142 L58 148 L56 142 L50 140 Z" fill="#818CF8" opacity="0.6" />
          <path d="M50 66 Q56 54 66 60" stroke="#1E1B4B" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      </div>
      <h2 className="text-[17px] font-semibold text-[--text-primary] mb-2">No assignments yet</h2>
      <p className="text-[13px] text-[--text-secondary] text-center max-w-sm leading-relaxed mb-7">
        Create your first assignment to start collecting and grading student submissions.
        You can set up rubrics, define marking criteria, and let AI assist with grading.
      </p>
      <Link href="/assignments/create"
        className="inline-flex items-center gap-2 px-6 py-3 bg-[--text-primary] text-white text-[13px] font-medium rounded-full hover:bg-zinc-700 transition-colors">
        <Plus size={15} /> Create Your First Assignment
      </Link>
    </div>
  );
}

export default function AssignmentsList() {
  useWebSocket();
  const dispatch = useAppDispatch();
  const assignments = useAppSelector(selectAllAssignments);
  const status = useAppSelector(selectAssignmentsStatus);
  const error = useAppSelector(selectAssignmentsError);
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchAssignments());
  }, [dispatch]);

  const filtered = assignments.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  if (status === 'loading') {
    return (
      <div className="flex flex-col gap-3 p-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl h-24 shimmer border border-[--border]" />
        ))}
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-[--text-secondary] text-[13px]">{error}</p>
        <button onClick={() => dispatch(fetchAssignments())}
          className="text-[--brand] text-[13px] flex items-center gap-1">
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  if (assignments.length === 0) return <EmptyState />;

  return (
    <div className="p-5">
      <div className="mb-4">
        <h1 className="text-[16px] font-semibold text-[--text-primary]">Assignments</h1>
        <p className="text-[12px] text-[--text-secondary] mt-0.5">
          Manage and create assignments for your classes.
        </p>
      </div>

      {/* Filter + Search bar */}
      <div className="flex items-center gap-3 mb-5">
        <button className="flex items-center gap-2 px-3 py-2 border border-[--border] rounded-lg text-[13px] text-[--text-secondary] bg-white hover:bg-zinc-50 transition-colors">
          <Filter size={13} /> Filter by
        </button>
        <div className="flex items-center gap-2 flex-1 max-w-xs bg-white border border-[--border] rounded-lg px-3 py-2">
          <Search size={13} className="text-[--text-muted]" />
          <input type="text" placeholder="Search assignment"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="text-[13px] outline-none flex-1 bg-transparent" />
        </div>
        <Link href="/assignments/create"
          className="ml-auto hidden md:inline-flex items-center gap-1.5 px-4 py-2 bg-[--text-primary] text-white text-[12px] font-medium rounded-full hover:bg-zinc-700 transition-colors">
          <Plus size={13} /> New
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((a) => <AssignmentCard key={a.id} assignment={a} />)}
      </div>

      {filtered.length === 0 && search && (
        <p className="text-center text-[13px] text-[--text-muted] mt-10">
          No assignments matching "{search}"
        </p>
      )}

      {/* Mobile FAB */}
      <Link href="/assignments/create"
        className="md:hidden fixed bottom-20 right-4 w-12 h-12 bg-[--brand] rounded-full shadow-lg flex items-center justify-center text-white z-20">
        <Plus size={22} />
      </Link>
    </div>
  );
}