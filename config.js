require('dotenv').config();

module.exports = {
    OLLAMA_HOST: process.env.OLLAMA_HOST || 'http://localhost:11434',
    OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'gemma4:e4b',
    SYSTEM_PROMPT: process.env.SYSTEM_PROMPT || 'You are a helpful and concise WhatsApp assistant. Keep your answers brief.',
    REPLY_MODE: process.env.REPLY_MODE || 'dm', // 'all', 'dm', or 'keyword'
    TRIGGER_KEYWORD: process.env.TRIGGER_KEYWORD || '!ai',
    CONTEXT_WINDOW: parseInt(process.env.CONTEXT_WINDOW, 10) || 10,

    // Anti-ban settings
    REPLY_DELAY_MIN: parseInt(process.env.REPLY_DELAY_MIN, 10) || 3,       // minimum seconds before reply
    REPLY_DELAY_MAX: parseInt(process.env.REPLY_DELAY_MAX, 10) || 8,       // maximum seconds before reply
    MAX_REPLIES_PER_MIN: parseInt(process.env.MAX_REPLIES_PER_MIN, 10) || 5, // rate limit per minute
    ACTIVE_HOURS_START: parseInt(process.env.ACTIVE_HOURS_START, 10) || 7,  // bot active from 7 AM
    ACTIVE_HOURS_END: parseInt(process.env.ACTIVE_HOURS_END, 10) || 22,    // bot active until 10 PM
    ACTIVE_HOURS_ENABLED: (process.env.ACTIVE_HOURS_ENABLED || 'true') === 'true'
};
