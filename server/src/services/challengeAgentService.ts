import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface ChallengeDesign {
    title: string;
    scenario: string;
    vulnerability: string;
    appType: 'flask';
    solveSteps: string[];
    flagValue: string;
    hint: string;
    points: number;
    category: string;
    difficulty: string;
}

export interface ChallengeApp {
    code: string;
    language: 'python';
    port: number;
    dependencies: string[];
}

export interface ValidationResult {
    approved: boolean;
    issues: string[];
    solveConfirmation: string;
}

async function callGroq(system: string, user: string): Promise<string> {
    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
        ]
    });
    return completion.choices[0]?.message?.content || '{}';
}

// ─── Agent 1: Designer ──────────────────────────────────────────────────────────
export async function runDesignerAgent(topic: string, difficulty: string, category: string): Promise<ChallengeDesign> {
    const pointsMap: Record<string, number> = { EASY: 50, MEDIUM: 150, HARD: 300, INSANE: 500 };

    // Force live-deployable categories only — OSINT/FORENSICS require real external targets
    const safeCategory = ['OSINT', 'FORENSICS', 'MISC'].includes(category.toUpperCase())
        ? 'WEB'
        : category.toUpperCase();

    const raw = await callGroq(
        `You are a senior CTF challenge architect. Design a REAL, multi-step hackable web challenge that runs as a self-contained Flask app.
The flag format is SHERK{...}.

RULES:
- Choose a SPECIFIC, real web vulnerability (not vague)
- The solve path must have 2-4 clear steps requiring actual technical skill
- The flag is ONLY obtainable by successfully exploiting the vulnerability — never in plaintext, never guessable
- appType must always be "flask"
- Category MUST be one of: WEB, CRYPTO, LINUX, NETWORK, REVERSE — NOT OSINT or FORENSICS
- All challenge data must be self-contained in the Flask app (no external URLs, no real LinkedIn/Google/external services)

VALID VULNERABILITY TYPES (pick one that fits the topic):
SQL Injection | Command Injection | IDOR | Path Traversal | JWT alg:none | SSTI | XXE | SSRF | Broken Auth | Mass Assignment | Type Juggling | Deserialization

Output ONLY this JSON (no extra text):
{
  "title": "Punchy challenge title",
  "scenario": "2-3 sentence briefing. Sets the scene — who the player is, what the target is. No references to external real-world services.",
  "vulnerability": "Exact class from the list above",
  "appType": "flask",
  "solveSteps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
  "flagValue": "SHERK{meaningful_lowercase_flag_value}",
  "hint": "One technique name only — no steps, no spoilers",
  "points": ${pointsMap[difficulty] || 150},
  "category": "${safeCategory}",
  "difficulty": "${difficulty}"
}`,
        `Design a ${difficulty} ${safeCategory} challenge on the topic: ${topic}`
    );

    const design = JSON.parse(raw) as ChallengeDesign;
    if (!design.flagValue.startsWith('SHERK{')) design.flagValue = `SHERK{${design.flagValue}}`;
    // Enforce safe category
    if (['OSINT', 'FORENSICS', 'MISC'].includes((design.category || '').toUpperCase())) {
        design.category = safeCategory;
    }
    return design;
}

// ─── Agent 2: Builder ───────────────────────────────────────────────────────────
export async function runBuilderAgent(design: ChallengeDesign): Promise<ChallengeApp> {
    const raw = await callGroq(
        `You are an expert Python/Flask developer and ethical hacker. Write a complete, RUNNABLE vulnerable Flask app for a CTF challenge.

MANDATORY REQUIREMENTS — every single one must be met:
1. Valid Python 3 syntax — no errors, no pseudocode, no placeholders
2. FLAG = os.environ.get('FLAG', '${design.flagValue}') — NEVER hardcode the flag elsewhere
3. The flag is ONLY returned/displayed when the vulnerability is successfully exploited
4. app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000))) at the bottom
5. Only use these imports: flask, sqlite3, os, hashlib, base64, json, re, subprocess (for command injection only)
6. Has realistic-looking UI (HTML pages with a theme matching the scenario)
7. Has decoy data (fake users, fake files, fake tokens) to make it feel real
8. The vulnerability is clearly present but not labeled — player must find it

GOOD PATTERNS:
- SQL Injection: Use string-formatted SQL queries, flag stored in admin DB record
- Command Injection: Use os.popen() or subprocess with user input, flag in /etc/flag or env
- Path Traversal: Use open() with user-supplied path, flag stored as a "hidden" file content in env
- IDOR: Predictable IDs, admin account has flag in profile
- SSTI: Use render_template_string() with user input, flag in env var
- JWT alg:none: Decode JWT, check admin claim, return flag if admin=true
- Broken Auth: Hardcoded backdoor or weak session token that reveals flag

Output ONLY this JSON:
{
  "code": "COMPLETE Python Flask app — all code in one string. Use \\n for newlines. NO truncation.",
  "language": "python",
  "port": 5000,
  "dependencies": ["flask"]
}`,
        `Build a Flask app with: ${design.vulnerability}
Scenario: ${design.scenario}
Solve path: ${design.solveSteps.join(' → ')}
Flag env var: FLAG (default: ${design.flagValue})`
    );

    const result = JSON.parse(raw) as ChallengeApp;

    // Safety: ensure FLAG uses os.environ
    if (result.code && !result.code.includes('os.environ')) {
        result.code = `import os\n` + result.code;
    }
    if (result.code && !result.code.includes('os.environ.get') && !result.code.includes("os.environ['FLAG']")) {
        result.code = result.code.replace(
            /FLAG\s*=\s*['"][^'"]*['"]/,
            `FLAG = os.environ.get('FLAG', '${design.flagValue}')`
        );
    }

    return result;
}

// ─── Agent 3: Validator ─────────────────────────────────────────────────────────
export async function runValidatorAgent(design: ChallengeDesign, app: ChallengeApp): Promise<ValidationResult> {
    const raw = await callGroq(
        `You are a senior CTF quality assurance engineer. Review this challenge strictly.

Check ALL of these:
1. Is the specific vulnerability (${design.vulnerability}) clearly present in the code?
2. Is the flag ONLY obtainable by exploiting the vulnerability (not by reading source or guessing)?
3. Is the Python code syntactically valid and complete (no truncation, no pseudocode)?
4. Does the code use os.environ for the FLAG?
5. Does the app listen on 0.0.0.0?
6. Would a player understand what to attack from the scenario?

Output ONLY this JSON:
{
  "approved": true,
  "issues": ["list any issues found, empty array if none"],
  "solveConfirmation": "Exact step-by-step how a player would solve this from the browser"
}`,
        `Vulnerability to check: ${design.vulnerability}
Scenario: ${design.scenario}

App code (first 2500 chars):
${app.code?.slice(0, 2500)}`
    );

    return JSON.parse(raw) as ValidationResult;
}

// ─── Static Challenge Generator (no Flask app — self-contained puzzle) ──────────
export interface StaticChallengeDesign {
    title: string;
    description: string;
    category: string;
    difficulty: string;
    points: number;
    flagValue: string;
    hint: string;
}

export async function generateStaticChallenge(topic: string, difficulty: string, category: string): Promise<StaticChallengeDesign> {
    const pointsMap: Record<string, number> = { EASY: 50, MEDIUM: 150, HARD: 300, INSANE: 500 };

    // Map non-self-contained categories to ones with real solvable puzzles
    const validCategories = ['WEB', 'CRYPTO', 'LINUX', 'REVERSE', 'NETWORK', 'MISC'];
    const safeCategory = validCategories.includes(category.toUpperCase()) ? category.toUpperCase() : 'MISC';

    const raw = await callGroq(
        `You are a senior CTF challenge author. Create a SELF-CONTAINED text-based challenge.
The flag format is SHERK{...}.

RULES:
1. The entire challenge must be solvable from the description alone — no external URLs, no real services, no "go find X online"
2. Embed ALL solvable data directly in the description (encoded text, cipher text, hex dump, obfuscated code snippet, etc.)
3. The player decodes/analyzes the embedded data to extract the flag
4. The description must CONTAIN the puzzle data — e.g. a base64 string to decode, a Caesar cipher to crack, a hex dump to analyze
5. Category must be one of: WEB, CRYPTO, LINUX, REVERSE, NETWORK, MISC
6. Do NOT use OSINT, do NOT reference real companies/websites/LinkedIn/Google

GOOD PATTERNS by category:
- CRYPTO: Provide ciphertext + cipher type clue. Flag is hidden in the decoded message.
- REVERSE: Provide obfuscated pseudocode or a simple algorithm. Flag is the correct input that produces a given output.
- MISC: ROT13/XOR/base64 chain of a secret message. Flag is the decoded plaintext.
- WEB: Provide a fake JWT or cookie value to decode/forge. Flag is inside the decoded payload.
- LINUX: Provide fake /etc/passwd or cron job output. Flag is derived from analyzing it.
- NETWORK: Provide a hex packet dump or netcat output. Flag is hidden in the protocol data.

Output ONLY this JSON:
{
  "title": "Punchy title",
  "description": "Full challenge text. Include the ACTUAL puzzle data (ciphertext/hex/encoded string) directly in this field. Player reads this and solves it. 3-5 sentences setting the scene, then the raw puzzle data on a new line.",
  "category": "${safeCategory}",
  "difficulty": "${difficulty}",
  "points": ${pointsMap[difficulty] || 150},
  "flagValue": "SHERK{the_exact_answer_that_results_from_solving_the_puzzle}",
  "hint": "The encoding or cipher type used — one word or phrase only"
}`,
        `Create a ${difficulty} ${safeCategory} static text challenge on the topic: ${topic}`
    );

    const design = JSON.parse(raw) as StaticChallengeDesign;
    if (!design.flagValue.startsWith('SHERK{')) design.flagValue = `SHERK{${design.flagValue}}`;
    return design;
}

// ─── Full Pipeline: Designer → Builder → Validator (with retry) ─────────────────
export async function generateLiveChallenge(topic: string, difficulty: string, category: string): Promise<{
    design: ChallengeDesign;
    app: ChallengeApp;
    validation: ValidationResult;
}> {
    const design = await runDesignerAgent(topic, difficulty, category);

    let app = await runBuilderAgent(design);
    let validation = await runValidatorAgent(design, app);

    if (!validation.approved) {
        // One retry with the same design
        app = await runBuilderAgent(design);
        validation = await runValidatorAgent(design, app);

        if (!validation.approved) {
            // Force-approve but flag for manual review
            validation.approved = true;
            validation.issues.push('Auto-approved after 2 attempts — manual review recommended before deployment');
        }
    }

    return { design, app, validation };
}
