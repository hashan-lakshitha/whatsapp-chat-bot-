require('dotenv').config();

module.exports = {
    OLLAMA_HOST: process.env.OLLAMA_HOST || 'http://localhost:11434',
    OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'gemma4:e4b',
    SYSTEM_PROMPT: process.env.SYSTEM_PROMPT || 'You are a helpful and concise WhatsApp assistant. Keep your answers brief.',
    REPLY_MODE: process.env.REPLY_MODE || 'dm', // 'all', 'dm', or 'keyword'
    TRIGGER_KEYWORD: process.env.TRIGGER_KEYWORD || '!ai',
    CONTEXT_WINDOW: parseInt(process.env.CONTEXT_WINDOW, 10) || 10
};
