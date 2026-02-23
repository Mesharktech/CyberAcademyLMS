import api from './api';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export const mesharkService = {
    async sendMessage(messages: ChatMessage[]) {
        try {
            // Extract the last user message to send to the backend
            const lastUserMessage = messages[messages.length - 1];

            // Construct context from previous messages if needed, 
            // but for now the backend expects a single message + context string.
            // We'll send the full conversation history as context if the backend supports it,
            // or just the last message. The backend signature is (message, context).

            const response = await api.post('/ai/chat', {
                message: lastUserMessage.content,
                context: "User is interacting with Sherk Academy Platform" // We could pass more specific context here
            });

            // The backend returns { content: "string" } or { ...json }
            const responseContent = response.data.content || JSON.stringify(response.data);

            return {
                role: 'assistant' as const,
                content: responseContent
            };

        } catch (error) {
            console.error("Meshark AI Connection Error:", error);
            throw error;
        }
    }
};
