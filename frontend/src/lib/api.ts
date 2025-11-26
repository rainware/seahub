import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    timeout: 10000,
});

export const getDags = (params?: { page?: number, page_size?: number }) => api.get('/dags/', { params });
export const getDagDetail = (id: string) => api.get(`/dags/${id}/`);
export const createDag = (dsl: any) => api.post('/dags/', dsl);

export const getTasks = (params?: { page?: number, page_size?: number }) => api.get('/tasks/', { params });
export const getTaskDetail = (id: string) => api.get(`/tasks/${id}/`);
export const triggerDag = (id: string) => api.post(`/dags/${id}/trigger/`);

export const getActions = (params?: { page?: number, page_size?: number }) => api.get('/actions/', { params });
export const createAction = (data: any) => api.post('/actions/', data);
export const deleteAction = (id: number) => api.delete(`/actions/${id}/`);

export default api;
