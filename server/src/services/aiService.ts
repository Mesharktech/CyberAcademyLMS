import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();

// --- Constants & Mock Data ---
const THREAT_ACTORS = ['APT-29 (Cozy Bear)', 'Lazarus Group', 'FIN7', 'Unknown State Actor', 'Script Kiddie'];
const VECTORS = ['Spearphishing Attachment', 'SQL Injection', 'Ransomware Variant', 'Zero-day Exploit', 'Supply Chain Compromise'];
const TARGETS = ['HR Database', 'Payment Gateway', 'CI/CD Pipeline', 'Legacy VPN Concentrator', 'Executive Laptop'];
const VULNERABILITIES = ['CVE-2024-3094 (XZ Utils)', 'Log4Shell Remnant', 'Weak RDP Credentials', 'Unpatched Exchange Server', 'Misconfigured S3 Bucket'];

const ACADEMY_KNOWLEDGE: Record<string, string> = {
    "dashboard": "The **Dashboard** is your tactical command center. It displays:\n- **Active Threat Map**: Real-time visualization of global cyberattacks.\n- **Daily Scenarios**: Generated challenges to test your containment skills.\n- **Containment Protocol**: An interactive module to simulate threat mitigation.",
    "courses": "We offer specialized training streams including:\n- **OWASP Top 10**: Web Vigilante training.\n- **Linux Fundamentals**: Command line mastery.\n- **Web VAPT**: Penetration testing tools and techniques.\nAccess them via the **Courses** tab.",
    "profile": "Your **Profile** tracks your operational status.\n- **Rank System**: Progress from 'Script Kiddie' to 'APT' (Advanced Persistent Threat) by completing modules.\n- **Stats**: View your completion rates and containment streaks.",
    "settings": "Configure your interface preferences in **Settings**. You can toggle sound effects, animations, and manage your account credentials.",
    "mission": "Sherk Academy is an elite training ground for offensive and defensive cyber operators. Our motto: *'Silence is Guidance'.* We focus on practical, real-world vectors.",
    "rank": "Ranks indicate your clearance level. Completing modules earns XP. High-level containment streaks unlock the 'Elite' and 'Omniscient' tiers."
};

const generateDescription = (actor: string, vector: string, target: string, vuln: string) => {
    const templates = [
        `Intelligence indicates active scanning by ${actor} targeting our ${target}. The attack vector appears to be a ${vector} leveraging ${vuln}. Immediate isolation recommended.`,
        `Anomaly detected in ${target} traffic logs. Pattern matches signatures associated with ${actor}. Attempted exploitation of ${vuln} via ${vector} observed. Containment protocols required.`,
        `Critical alert: ${vector} detected on ${target}. Heuristics suggest a variant used by ${actor}. Vulnerability ${vuln} is likely being exploited for initial access.`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
};

// --- Real AI Integration (Groq) ---
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function callGroqAPI(message: string, context: string): Promise<string | null> {
    if (!process.env.GROQ_API_KEY) return null;

    try {
        // Fetch absolute platform context
        const courses = await prisma.course.findMany({
            include: { modules: true }
        });

        const platformData = courses.map(c => `Course: ${c.title}\nModules: ${c.modules.map(m => m.title).join(', ')}`).join('\n\n');

        const systemPrompt = `You are Meshark AI, the omniscient Cyber Security Mentor at Sherk Academy. 
Your persona is professional, highly tactical, and encouraging ("Operative").
You have absolute knowledge of every single course and module available on this platform.

### CURRENT SHERK ACADEMY CURRICULUM:
${platformData}

### INSTRUCTIONS:
- The user is currently on the page/module: "${context}".
- Use your definitive knowledge of the curriculum to guide the user.
- If they ask what they can learn, recommend specific courses from the curriculum above.
- Keep responses concise, hacker-themed, and formatted with Markdown.`;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            // Updated to current stable model
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
        });

        return completion.choices[0]?.message?.content || null;

    } catch (error) {
        console.error("Groq API Call Failed:", error);
        return null;
    }
}

// --- Service Export ---
export const aiService = {
    async analyzeSubmission(content: string, context: string = 'general'): Promise<string> {
        // Simple mock analysis for now, can be upgraded to use Groq too
        return JSON.stringify({
            status: "analyzed",
            feedback: `AI Analysis Complete. Context: ${context}. \n\nObservations:\n1. The submitted code/input shows standard patterns.\n2. No critical vulnerabilities detected in the immediate snippet.\n3. Recommendation: Review input validation layers.`,
            hints: ["Check for edge cases in input handling.", "Ensure rigorous sanitization of user data."]
        });
    },

    async generateDailyScenario(): Promise<string> {
        const actor = THREAT_ACTORS[Math.floor(Math.random() * THREAT_ACTORS.length)];
        const vector = VECTORS[Math.floor(Math.random() * VECTORS.length)];
        const target = TARGETS[Math.floor(Math.random() * TARGETS.length)];
        const vuln = VULNERABILITIES[Math.floor(Math.random() * VULNERABILITIES.length)];
        const difficulty = Math.floor(Math.random() * 5) + 1;
        const description = generateDescription(actor, vector, target, vuln);

        return JSON.stringify({
            title: `${vector} on ${target}`,
            description: description,
            difficulty: difficulty,
            category: "Daily Threat Intel",
            technical_details: { actor, vector, target, cve: vuln }
        });
    },

    async chat(message: string, context: string = ''): Promise<string> {
        // 1. Try Real Groq API with Full Omniscience
        const realResponse = await callGroqAPI(message, context);
        if (realResponse) {
            return JSON.stringify({
                role: "assistant",
                content: realResponse,
                timestamp: new Date().toISOString()
            });
        }

        // 3. Fallback to Simple Logic (Offline/Mock)
        const lowerMsg = message.toLowerCase();
        let response = "";
        const isGreeting = /\b(hello|hi|hey|greetings|start)\b/i.test(lowerMsg);
        const isHelp = /\b(help|stuck|assist|confused)\b/i.test(lowerMsg);

        if (isGreeting) {
            response = `Greetings, Operative. I am Meshark AI, your designated Cyber Mentor. I see you are currently engaging with **${context || 'Training Modules'}**. How can I assist with your mission? (Offline Mode)`;
        } else if (isHelp) {
            response = "It appears you require tactical assistance. Please specify the vector or concept causing the obstruction.";
        } else {
            response = `Input processed: "${message}". \n\n(Note: Neural Link offline. Using fallback protocols. Verification: ${context})`;
        }

        return JSON.stringify({
            role: "assistant",
            content: response,
            timestamp: new Date().toISOString()
        });
    }
};
