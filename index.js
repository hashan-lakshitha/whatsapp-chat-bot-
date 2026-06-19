const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const config = require('./config');
const ollama = require('./ollama');

// Store chat histories to maintain context
const chatHistories = new Map();

// Rate limiter: track reply timestamps globally
const replyTimestamps = [];

// Helper: random delay between min and max minutes
function randomDelayMinutes(minMin, maxMin) {
    const minutes = minMin + Math.random() * (maxMin - minMin);
    const ms = Math.floor(minutes * 60 * 1000);
    return { ms, minutes };
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: check if current hour is within active hours
function isWithinActiveHours() {
    if (!config.ACTIVE_HOURS_ENABLED) return true;
    const hour = new Date().getHours();
    return hour >= config.ACTIVE_HOURS_START && hour < config.ACTIVE_HOURS_END;
}

// Helper: check rate limit (returns true if allowed)
function isRateLimitOk() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove timestamps older than 1 minute
    while (replyTimestamps.length > 0 && replyTimestamps[0] < oneMinuteAgo) {
        replyTimestamps.shift();
    }

    return replyTimestamps.length < config.MAX_REPLIES_PER_MIN;
}

// Initialize WhatsApp Client with LocalAuth for session persistence
const client = new Client({
    authStrategy: new LocalAuth(),
    authTimeoutMs: 120000,
    webVersionCache: {
        type: 'none'
    },
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--no-first-run'
        ]
    }
});

// Show loading progress
client.on('loading_screen', (percent, message) => {
    console.log(`[LOADING] ${percent}% - ${message}`);
});

// Generate and display QR Code
client.on('qr', (qr) => {
    console.log('Scan the QR code below to log in to WhatsApp Web:');
    qrcode.generate(qr, { small: true });
});

// Client is ready
client.on('ready', () => {
    console.log('[READY] WhatsApp client is ready and connected!');
    console.log(`[CONFIG] Model: ${config.OLLAMA_MODEL}`);
    console.log(`[CONFIG] Reply Mode: ${config.REPLY_MODE}`);
    console.log(`[CONFIG] Reply Delay: ${config.REPLY_DELAY_MIN}-${config.REPLY_DELAY_MAX}s`);
    console.log(`[CONFIG] Rate Limit: ${config.MAX_REPLIES_PER_MIN} replies/min`);
    console.log(`[CONFIG] Active Hours: ${config.ACTIVE_HOURS_ENABLED ? config.ACTIVE_HOURS_START + ':00 - ' + config.ACTIVE_HOURS_END + ':00' : 'disabled (24/7)'}`);
    console.log('Waiting for messages...\n');
});

// Authentication events
client.on('authenticated', () => {
    console.log('[AUTH] Authenticated successfully!');
});

client.on('auth_failure', (msg) => {
    console.error('[AUTH ERROR] Authentication failed:', msg);
});

client.on('disconnected', (reason) => {
    console.log('[DISCONNECTED]', reason);
});

// Listen for incoming messages (use 'message' event for received messages)
client.on('message', async (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] [INCOMING] Message from ${msg.from}: "${msg.body}"`);

    // Anti-ban: Check active hours
    if (!isWithinActiveHours()) {
        console.log(`[${timestamp}] [OUTSIDE HOURS] Bot is sleeping (active ${config.ACTIVE_HOURS_START}:00 - ${config.ACTIVE_HOURS_END}:00)`);
        return;
    }

    // Determine if we should reply based on REPLY_MODE
    const isGroup = msg.from.includes('@g.us');
    const isDM = msg.from.includes('@c.us') || msg.from.includes('@lid');

    let shouldReply = false;
    let messageText = msg.body;

    if (config.REPLY_MODE === 'all') {
        shouldReply = true;
    } else if (config.REPLY_MODE === 'dm') {
        shouldReply = isDM;
    } else if (config.REPLY_MODE === 'keyword') {
        if (msg.body.toLowerCase().startsWith(config.TRIGGER_KEYWORD.toLowerCase())) {
            shouldReply = true;
            // Remove the keyword from the message text
            messageText = msg.body.slice(config.TRIGGER_KEYWORD.length).trim();
        }
    }

    if (!shouldReply) {
        console.log(`[${timestamp}] [SKIPPED] (mode: ${config.REPLY_MODE}, isGroup: ${isGroup})`);
        return;
    }

    // Anti-ban: Check rate limit
    if (!isRateLimitOk()) {
        console.log(`[${timestamp}] [RATE LIMITED] Too many replies (max ${config.MAX_REPLIES_PER_MIN}/min). Skipping.`);
        return;
    }

    console.log(`[${timestamp}] [PROCESSING] Processing message...`);

    const chatId = msg.from;

    // Initialize history for this chat if it doesn't exist
    if (!chatHistories.has(chatId)) {
        chatHistories.set(chatId, [
            { role: 'system', content: config.SYSTEM_PROMPT }
        ]);
    }

    const history = chatHistories.get(chatId);

    // Add user message to history
    history.push({ role: 'user', content: messageText });

    // Keep history within CONTEXT_WINDOW (plus the system prompt)
    if (history.length > config.CONTEXT_WINDOW + 1) {
        // Remove the oldest message (at index 1, right after the system prompt)
        history.splice(1, 1);
    }

    try {
        // Get response from Ollama first (before delay)
        console.log(`[${timestamp}] [OLLAMA] Sending to Ollama...`);
        const aiResponse = await ollama.chat(history);

        // Anti-ban: Random delay before replying (simulates human reading + typing)
        const { ms, minutes } = randomDelayMinutes(config.REPLY_DELAY_MIN, config.REPLY_DELAY_MAX);
        const replyTime = new Date(Date.now() + ms).toLocaleTimeString();
        console.log(`\n${'─'.repeat(50)}`);
        console.log(`[RECEIVED at ${timestamp}] "${messageText}"`);
        console.log(`[REPLY ready]            "${aiResponse}"`);
        console.log(`[WAITING] ${minutes.toFixed(1)} min -- will send at ${replyTime}`);
        console.log(`${'─'.repeat(50)}\n`);

        await sleep(ms);

        // Show typing indicator just before sending (human-like)
        const chat = await msg.getChat();
        await chat.sendStateTyping();
        await sleep(2000 + Math.random() * 3000); // short typing pause 2-5s

        // Add assistant response to history
        history.push({ role: 'assistant', content: aiResponse });

        // Record this reply for rate limiting
        replyTimestamps.push(Date.now());

        // Send the reply
        const sentTime = new Date().toLocaleTimeString();
        await msg.reply(aiResponse);
        console.log(`[${sentTime}] [SENT] Reply delivered!`);

    } catch (error) {
        console.error(`[${timestamp}] [ERROR]`, error.message);
        await msg.reply('Sorry, I encountered an error. Is Ollama running? (ollama serve)');
    }
});

// Start the client
console.log('[START] Starting WhatsApp bot...');
client.initialize().catch((err) => {
    console.error('[ERROR] Failed to initialize:', err.message);
});
