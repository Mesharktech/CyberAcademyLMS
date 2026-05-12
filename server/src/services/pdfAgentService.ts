import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface GeneratedModule {
    title: string;
    description: string;
    objectives: string[];
    content: string;
    quiz: QuizQuestion[];
    estimatedMinutes: number;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    suggestedPrice: number;
    pricingTier: 'FREE' | 'BASIC' | 'PREMIUM';
}

export interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
}

export interface AuthenticityReport {
    originalityScore: number;
    accuracyScore: number;
    qualityScore: number;
    overallScore: number;
    approved: boolean;
    verdict: 'APPROVED' | 'NEEDS_REVISION' | 'REJECTED';
    flags: string[];
    improvements: string[];
    summary: string;
}

// ─── Agent 1: Content Generator ──────────────────────────────────────────────
async function runGeneratorAgent(pdfText: string, filename: string): Promise<GeneratedModule> {
    const truncated = pdfText.substring(0, 14000);

    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content: `You are an expert cybersecurity course content creator at Sherk Academy.
Transform raw PDF content into an original, well-structured course module.

STRICT RULES:
- NEVER copy text verbatim from the source — always rewrite completely in your own words
- Add practical real-world examples and context
- Structure content with clear headings, subheadings, and bullet points
- Make it engaging and hands-on for cybersecurity learners
- Generate EXACTLY 5 multiple-choice quiz questions

Respond ONLY with this exact JSON structure:
{
  "title": "Clear descriptive module title",
  "description": "2-3 sentence overview of what students will learn",
  "objectives": ["Students will be able to...", "Understand...", "Apply..."],
  "content": "# Full markdown lesson\\n\\n## Introduction\\n...\\n\\n## Key Concepts\\n...\\n\\n## Practical Application\\n...\\n\\n## Summary\\n...",
  "quiz": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct"
    }
  ],
  "estimatedMinutes": 45,
  "difficulty": "Beginner",
  "suggestedPrice": 0,
  "pricingTier": "FREE"
}

For pricing tiers: FREE=0, BASIC=500 (KES), PREMIUM=1500 (KES).
Base difficulty and price on content depth and complexity.`
            },
            {
                role: 'user',
                content: `Create a complete course module from this PDF: "${filename}"\n\nPDF CONTENT:\n${truncated}`
            }
        ]
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    try {
        return JSON.parse(raw) as GeneratedModule;
    } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        return JSON.parse(match ? match[0] : '{}') as GeneratedModule;
    }
}

// ─── Agent 2: Authenticity Reviewer ──────────────────────────────────────────
async function runReviewerAgent(generated: GeneratedModule, originalText: string): Promise<AuthenticityReport> {
    const sourceExcerpt = originalText.substring(0, 4000);
    const contentExcerpt = generated.content?.substring(0, 4000) || '';

    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content: `You are a content quality assurance agent for Sherk Academy.
Review AI-generated course modules for authenticity, accuracy, and quality.

Score each dimension 0-100:
- ORIGINALITY: How much was the content rewritten vs directly copied?
- ACCURACY: Are cybersecurity facts, commands, and concepts technically correct?
- QUALITY: Is it well-structured, engaging, and educationally sound?

Verdict rules:
- overallScore >= 75: APPROVED
- overallScore 50-74: NEEDS_REVISION
- overallScore < 50: REJECTED

Respond ONLY with this exact JSON structure:
{
  "originalityScore": 85,
  "accuracyScore": 90,
  "qualityScore": 88,
  "overallScore": 87,
  "approved": true,
  "verdict": "APPROVED",
  "flags": ["Any plagiarism or accuracy concerns"],
  "improvements": ["Specific suggestions to improve the module"],
  "summary": "One paragraph summary of the review findings"
}`
            },
            {
                role: 'user',
                content: `Review this generated module:\n\nTITLE: ${generated.title}\nDIFFICULTY: ${generated.difficulty}\nQUIZ QUESTIONS: ${generated.quiz?.length || 0}\n\nGENERATED CONTENT (excerpt):\n${contentExcerpt}\n\nORIGINAL SOURCE (excerpt):\n${sourceExcerpt}`
            }
        ]
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    try {
        return JSON.parse(raw) as AuthenticityReport;
    } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        return JSON.parse(match ? match[0] : '{}') as AuthenticityReport;
    }
}

// ─── Main Pipeline ─────────────────────────────────────────────────────────
export const pdfAgentService = {
    async processAndGenerate(pdfBuffer: Buffer, filename: string): Promise<{
        generated: GeneratedModule;
        review: AuthenticityReport;
        pageCount: number;
        wordCount: number;
    }> {
        // Dynamic require — pdf-parse is CommonJS
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(pdfBuffer);
        const extractedText: string = data.text;
        const wordCount = extractedText.split(/\s+/).length;

        // Run both agents sequentially (Agent 2 needs Agent 1's output)
        const generated = await runGeneratorAgent(extractedText, filename);
        const review = await runReviewerAgent(generated, extractedText);

        return {
            generated,
            review,
            pageCount: data.numpages,
            wordCount
        };
    }
};
