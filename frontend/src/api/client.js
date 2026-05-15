import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  signup: (data) => client.post('/auth/signup', data),
  login: (data) => client.post('/auth/login', data),
  me: () => client.get('/auth/me'),
};

// ── Projects ──────────────────────────────────────────────────────────────
export const projectsApi = {
  list: () => client.get('/projects'),
  create: (data) => client.post('/projects', data),
  get: (id) => client.get(`/projects/${id}`),
  update: (id, data) => client.put(`/projects/${id}`, data),
  delete: (id) => client.delete(`/projects/${id}`),
  members: (id) => client.get(`/projects/${id}/members`),
  addMember: (id, data) => client.post(`/projects/${id}/members`, data),
};

// ── Tasks ─────────────────────────────────────────────────────────────────
export const tasksApi = {
  list: (projectId) => client.get(`/projects/${projectId}/tasks`),
  create: (projectId, data) => client.post(`/projects/${projectId}/tasks`, data),
  get: (projectId, taskId) => client.get(`/projects/${projectId}/tasks/${taskId}`),
  update: (projectId, taskId, data) =>
    client.put(`/projects/${projectId}/tasks/${taskId}`, data),
  delete: (projectId, taskId) =>
    client.delete(`/projects/${projectId}/tasks/${taskId}`),
};

// ── Subtasks ──────────────────────────────────────────────────────────────
export const subtasksApi = {
  list: (projectId, taskId) =>
    client.get(`/projects/${projectId}/tasks/${taskId}/subtasks`),
  create: (projectId, taskId, data) =>
    client.post(`/projects/${projectId}/tasks/${taskId}/subtasks`, data),
  update: (projectId, taskId, subtaskId, data) =>
    client.put(`/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`, data),
  delete: (projectId, taskId, subtaskId) =>
    client.delete(`/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`),
};

// ── Comments ──────────────────────────────────────────────────────────────
export const commentsApi = {
  list: (projectId, taskId) =>
    client.get(`/projects/${projectId}/tasks/${taskId}/comments`),
  create: (projectId, taskId, data) =>
    client.post(`/projects/${projectId}/tasks/${taskId}/comments`, data),
};

// ── Users ─────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => client.get('/users'),
};
