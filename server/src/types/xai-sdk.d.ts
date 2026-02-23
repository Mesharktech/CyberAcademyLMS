declare module 'xai-sdk' {
    export class XAIClient {
        constructor(options: { apiKey?: string; baseURL?: string });
        chat: {
            completions: {
                create(params: {
                    model: string;
                    messages: Array<{ role: string; content: string }>;
                    stream?: boolean;
                    temperature?: number;
                }): Promise<{
                    choices: Array<{
                        message: {
                            content: string;
                        };
                    }>;
                }>;
            }
        }
    }
}
