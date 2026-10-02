import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

export const TOKENS = {
    ADMIN: 'admin-token',
    ENGINEER: 'engineer-token',
    REVIEWER: 'reviewer-token',
    OPERATOR: 'operator-token',
    AUDITOR: 'reviewer-token', // maps to reviewer clearance in backend
};

export const createClient = (role = 'ENGINEER') => {
    const token = TOKENS[role] || TOKENS.ENGINEER;
    return axios.create({
        baseURL: API_BASE,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });
};

export const workbenchApi = {
    checkHealth: (role) => createClient(role).get('/health'),

    getUserProfile: (role) => createClient(role).get('/security/me'),

    evaluateSecurity: (role, classification = 'CONFIDENTIAL') =>
        createClient(role).post(`/security/evaluate?classification=${classification}`),

    processDocument: (role, doc) =>
        createClient(role).post('/documents/process', doc),

    // Real multipart file upload method
    uploadDocument: (role = 'ENGINEER', file) => {
        const formData = new FormData();
        formData.append('file', file);

        const token = TOKENS[role] || TOKENS.ENGINEER;
        return axios.post(`${API_BASE}/documents/process`, formData, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    },

    ingestRAG: (role, doc) =>
        createClient(role).post('/rag/ingest', doc),

    queryRAG: (role, query, topK = 3) =>
        createClient(role).post('/rag/query', { query, top_k: topK }),

    getRAGStats: (role) =>
        createClient(role).get('/rag/maintenance/stats'),

    getModelStatus: (role) => createClient(role).get('/models/status'),

    routeModel: (role, taskType, prompt, classification = 'GENERAL') =>
        createClient(role).post('/models/route', {
            task_type: taskType,
            prompt,
            classification,
        }),

    generateInference: (role, taskType, prompt, classification = 'GENERAL') =>
        createClient(role).post('/models/generate', {
            task_type: taskType,
            prompt,
            classification,
        }),

    runAgent: (role, task, documentText, filename = 'inspection_report.pdf') =>
        createClient(role).post('/agent/execute', {
            task,
            document_text: documentText,
            filename,
        }),

    approveAgentTask: (role, taskId, comment = null) =>
        createClient(role).post(`/agent/${taskId}/approve`, comment ? { comment } : {}),

    rejectAgentTask: (role, taskId, comment = null) =>
        createClient(role).post(`/agent/${taskId}/reject`, comment ? { comment } : {}),

    editAgentTask: (role, taskId, editInstructions, feedback = null) =>
        createClient(role).post(`/agent/${taskId}/edit`, {
            edit_instructions: editInstructions,
            feedback: feedback || undefined,
        }),
};