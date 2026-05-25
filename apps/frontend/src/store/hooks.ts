import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

// Typed hooks — use these everywhere instead of raw useDispatch / useSelector
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T>(selector: (state: RootState) => T): T =>
  useSelector<RootState, T>(selector);

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectAllAssignments = (state: RootState) =>
  state.assignments.items;

export const selectAssignmentById =
  (id: string) => (state: RootState) =>
    state.assignments.items.find((a) => a.id === id);

export const selectAssignmentsStatus = (state: RootState) =>
  state.assignments.status;

export const selectAssignmentsError = (state: RootState) =>
  state.assignments.error;

export const selectJobProgress =
  (assignmentId: string) => (state: RootState) =>
    state.assignments.jobProgress[assignmentId] ?? 0;

export const selectJobStatusMsg =
  (assignmentId: string) => (state: RootState) =>
    state.assignments.jobStatus[assignmentId] ?? '';
