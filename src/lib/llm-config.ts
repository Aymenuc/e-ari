// Flash — fast, lower-cost: assistant chatbot, literacy learning paths
export const LLM_API_URL = process.env.LLM_API_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';
export const LLM_MODEL = process.env.LLM_MODEL || 'deepseek-ai/deepseek-v4-flash';

// Pro — powerful, higher-cost: agentic tasks (roadmap, benchmark, discovery, recommendations)
export const LLM_API_URL_PRO = process.env.LLM_API_URL_PRO || 'https://integrate.api.nvidia.com/v1/chat/completions';
export const LLM_MODEL_PRO = process.env.LLM_MODEL_PRO || 'deepseek-ai/deepseek-v4-pro';
