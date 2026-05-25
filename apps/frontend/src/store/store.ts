import { configureStore } from '@reduxjs/toolkit';
import assignmentReducer from './assignmentSlice';

export const store = configureStore({
  reducer: {
    assignments: assignmentReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
