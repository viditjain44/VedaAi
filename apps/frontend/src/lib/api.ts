import axios from 'axios';
import type {
  Assignment,
  CreateAssignmentDto,
  GeneratedPaper,
  ApiResponse,
} from '@veda-ai/shared';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  timeout: 30000,
});

export const assignmentsApi = {
  list: async (): Promise<Assignment[]> => {
    const res = await api.get<ApiResponse<Assignment[]>>('/api/assignments');
    return res.data.data ?? [];
  },

  get: async (id: string): Promise<Assignment> => {
    const res = await api.get<ApiResponse<Assignment>>(
      `/api/assignments/${id}`
    );
    if (!res.data.data) throw new Error('Assignment not found');
    return res.data.data;
  },

  create: async (
    dto: CreateAssignmentDto,
    file?: File
  ): Promise<Assignment> => {
    const form = new FormData();
    form.append('title', dto.title);
    form.append('subject', dto.subject);
    form.append('grade', dto.grade);
    form.append('dueDate', dto.dueDate);
    form.append('totalMarks', String(dto.totalMarks));
    form.append('duration', String(dto.duration));
    form.append('questionConfigs', JSON.stringify(dto.questionConfigs));
    if (dto.instructions) form.append('instructions', dto.instructions);
    if (dto.topic) form.append('topic', dto.topic);
    if (file) form.append('file', file);

    const res = await api.post<ApiResponse<Assignment>>(
      '/api/assignments',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    if (!res.data.data) throw new Error('Failed to create assignment');
    return res.data.data;
  },

  regenerate: async (id: string): Promise<void> => {
    await api.post(`/api/assignments/${id}/regenerate`);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/assignments/${id}`);
  },

  getResult: async (id: string): Promise<GeneratedPaper> => {
    const res = await api.get<ApiResponse<GeneratedPaper>>(
      `/api/assignments/${id}/result`
    );
    if (!res.data.data) throw new Error('Paper not found');
    return res.data.data;
  },

  getPdfUrl: (id: string): string =>
    `${
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    }/api/assignments/${id}/pdf`,
};

export default api;
