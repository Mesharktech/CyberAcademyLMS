import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import path from 'path';

// Explicitly load .env from server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const apiKey = process.env.GROQ_API_KEY;
console.log("Checking API Key:", apiKey ? "Loaded" : "MISSING");

const groq = new Groq({ apiKey: apiKey });

async function main() {
    try {
        console.log("Attempting request to llama3-70b-8192...");
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "user", content: "Test" }
            ],
            model: "llama3-70b-8192",
        });
        console.log("Success:", completion.choices[0]?.message?.content);
    } catch (e: any) {
        console.error("FAILED:");
        console.error("Type:", e.constructor.name);
        console.error("Message:", e.message);
        if (e.error) {
            console.error("API Error Object:", JSON.stringify(e.error, null, 2));
        }
    }
}

main();
