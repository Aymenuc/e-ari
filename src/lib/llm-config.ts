// Flash — assistant chatbot, literacy learning paths
export const LLM_API_URL = process.env.LLM_API_URL || 'https://api.us-west-2.modal.direct/v1/chat/completions';
export const LLM_MODEL = process.env.LLM_MODEL || 'zai-org/GLM-5.1-FP8';

// Pro — agentic tasks (roadmap, benchmark, discovery, insights, context enrichment)
export const LLM_API_URL_PRO = process.env.LLM_API_URL_PRO || 'https://api.us-west-2.modal.direct/v1/chat/completions';
export const LLM_MODEL_PRO = process.env.LLM_MODEL_PRO || 'zai-org/GLM-5.1-FP8';
