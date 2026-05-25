import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Assignment, GeneratedPaper } from '@/types/shared';
import { assignmentsApi } from '@/lib/api';

// ─── State ────────────────────────────────────────────────────────────────────

export interface AssignmentState {
  items: Assignment[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  jobProgress: Record<string, number>;  // assignmentId → 0–100
  jobStatus: Record<string, string>;    // assignmentId → status message
}

const initialState: AssignmentState = {
  items: [],
  status: 'idle',
  error: null,
  jobProgress: {},
  jobStatus: {},
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchAssignments = createAsyncThunk(
  'assignments/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await assignmentsApi.list();
    } catch (err: unknown) {
      return rejectWithValue(
        err instanceof Error ? err.message : 'Failed to fetch assignments'
      );
    }
  }
);

export const fetchAssignment = createAsyncThunk(
  'assignments/fetchOne',
  async (id: string, { rejectWithValue }) => {
    try {
      return await assignmentsApi.get(id);
    } catch (err: unknown) {
      return rejectWithValue(
        err instanceof Error ? err.message : 'Assignment not found'
      );
    }
  }
);

export const createAssignment = createAsyncThunk(
  'assignments/create',
  async (
    payload: {
      dto: Parameters<typeof assignmentsApi.create>[0];
      file?: File;
    },
    { rejectWithValue }
  ) => {
    try {
      return await assignmentsApi.create(payload.dto, payload.file);
    } catch (err: unknown) {
      return rejectWithValue(
        err instanceof Error ? err.message : 'Failed to create assignment'
      );
    }
  }
);

export const regenerateAssignment = createAsyncThunk(
  'assignments/regenerate',
  async (id: string, { rejectWithValue }) => {
    try {
      await assignmentsApi.regenerate(id);
      return id;
    } catch (err: unknown) {
      return rejectWithValue(
        err instanceof Error ? err.message : 'Failed to regenerate'
      );
    }
  }
);

export const deleteAssignment = createAsyncThunk(
  'assignments/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await assignmentsApi.delete(id);
      return id;
    } catch (err: unknown) {
      return rejectWithValue(
        err instanceof Error ? err.message : 'Failed to delete'
      );
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const assignmentSlice = createSlice({
  name: 'assignments',
  initialState,
  reducers: {
    // WebSocket event reducers
    wsJobQueued(
      state,
      action: PayloadAction<{ assignmentId: string; jobId: string }>
    ) {
      const { assignmentId } = action.payload;
      state.jobProgress[assignmentId] = 0;
      state.jobStatus[assignmentId] = 'Queued for generation…';
      const item = state.items.find((a) => a.id === assignmentId);
      if (item) {
        item.status = 'queued';
        item.progress = 0;
      }
    },

    wsJobProcessing(
      state,
      action: PayloadAction<{ assignmentId: string; progress: number }>
    ) {
      const { assignmentId, progress } = action.payload;
      state.jobProgress[assignmentId] = progress;
      state.jobStatus[assignmentId] = 'AI is generating your paper…';
      const item = state.items.find((a) => a.id === assignmentId);
      if (item) {
        item.status = 'processing';
        item.progress = progress;
      }
    },

    wsJobCompleted(
      state,
      action: PayloadAction<{ assignmentId: string; result: GeneratedPaper }>
    ) {
      const { assignmentId, result } = action.payload;
      state.jobProgress[assignmentId] = 100;
      state.jobStatus[assignmentId] = 'Completed';
      const item = state.items.find((a) => a.id === assignmentId);
      if (item) {
        item.status = 'completed';
        item.progress = 100;
        item.paper = result;
      }
    },

    wsJobFailed(
      state,
      action: PayloadAction<{ assignmentId: string; error: string }>
    ) {
      const { assignmentId, error } = action.payload;
      state.jobProgress[assignmentId] = 0;
      state.jobStatus[assignmentId] = `Failed: ${error}`;
      const item = state.items.find((a) => a.id === assignmentId);
      if (item) {
        item.status = 'failed';
        item.errorMessage = error;
        item.progress = 0;
      }
    },

    // Direct patch (for optimistic updates)
    patchAssignment(
      state,
      action: PayloadAction<Partial<Assignment> & { id: string }>
    ) {
      const { id, ...updates } = action.payload;
      const item = state.items.find((a) => a.id === id);
      if (item) Object.assign(item, updates);
    },
  },

  extraReducers: (builder) => {
    // ── fetchAll ──────────────────────────────────────────────────────────
    builder
      .addCase(fetchAssignments.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAssignments.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchAssignments.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });

    // ── fetchOne — upsert ─────────────────────────────────────────────────
    builder.addCase(fetchAssignment.fulfilled, (state, action) => {
      const incoming = action.payload;
      const idx = state.items.findIndex((a) => a.id === incoming.id);
      if (idx >= 0) {
        state.items[idx] = incoming;
      } else {
        state.items.unshift(incoming);
      }
    });

    // ── create ────────────────────────────────────────────────────────────
    builder.addCase(createAssignment.fulfilled, (state, action) => {
      state.items.unshift(action.payload);
    });

    // ── regenerate ────────────────────────────────────────────────────────
    builder.addCase(regenerateAssignment.fulfilled, (state, action) => {
      const item = state.items.find((a) => a.id === action.payload);
      if (item) {
        item.status = 'queued';
        item.progress = 0;
        item.paper = undefined;
        item.errorMessage = undefined;
      }
    });

    // ── delete ────────────────────────────────────────────────────────────
    builder.addCase(deleteAssignment.fulfilled, (state, action) => {
      state.items = state.items.filter((a) => a.id !== action.payload);
    });
  },
});

export const {
  wsJobQueued,
  wsJobProcessing,
  wsJobCompleted,
  wsJobFailed,
  patchAssignment,
} = assignmentSlice.actions;

export default assignmentSlice.reducer;
