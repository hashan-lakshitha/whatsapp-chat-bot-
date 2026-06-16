const config = require('./config');

async function chat(messages) {
    try {
        const response = await fetch(`${config.OLLAMA_HOST}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: config.OLLAMA_MODEL,
                messages: messages,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.message.content;
    } catch (error) {
        console.error('Error communicating with Ollama:', error.message);
        throw error;
    }
}

module.exports = { chat };
