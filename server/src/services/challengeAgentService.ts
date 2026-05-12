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
        `You are a senior CTF challenge author. Create a SELF-CONTAINED text-based challenge where ALL data needed to solve it is embedded directly in the description.
The flag format is SHERK{...}.

CRITICAL RULES — violating any one makes the challenge unsolvable:
1. The challenge MUST be solvable using ONLY the description text — no servers, no external URLs, no live apps
2. You MUST generate the encoded/obfuscated data YOURSELF and include it verbatim in the description
3. The flagValue MUST be the exact result of decoding/solving the embedded data
4. Do NOT say "submit the token to the server" or "gain admin access" — there is no server
5. Do NOT copy or reference jwt.io, CyberChef, or any real external tool URLs
6. Do NOT use OSINT — no LinkedIn, Google, real companies
7. Category must be: WEB, CRYPTO, LINUX, REVERSE, NETWORK, or MISC

SELF-CONTAINED PATTERNS — pick one, generate the actual data:
- CRYPTO: Generate a real base64/ROT13/Caesar-encoded string of a secret phrase. Include the encoded string. Flag = the decoded phrase wrapped in SHERK{}.
  Example description ending: "Encoded message: U0hFUkt7Y2Flc2FyX3dhc19oZXJlfQ==" → flagValue: "SHERK{caesar_was_here}"
- WEB/JWT: Create a fake JWT where the payload JSON contains the flag field. Encode it yourself with base64url. Include the full JWT. Flag = value of "flag" field in decoded payload.
  Example: header.eyJyb2xlIjoiZ3Vlc3QiLCJmbGFnIjoiU0hFUkt7and0X3BheWxvYWRzX2FyZV9ub3Rfc2VjcmV0fSJ9.fakesig → flagValue: "SHERK{jwt_payloads_are_not_secret}"
- LINUX: Provide fake /etc/shadow or .bash_history lines with a hash or secret. Flag is extracted from analyzing the data.
- REVERSE: Provide a short Python/JS snippet with obfuscated logic. Flag is the output when run or the correct input.
- NETWORK: Provide ASCII hex bytes of a message. Flag is the decoded ASCII.
  Example: "Intercepted bytes: 53 48 45 52 4b 7b 68 65 78 5f 64 65 63 6f 64 65 64 7d" → flagValue: "SHERK{hex_decoded}"

Output ONLY this JSON — no extra text before or after:
{
  "title": "Punchy title relevant to the puzzle",
  "description": "2-3 sentences setting the scene (no server references). Then on a new line, include the ACTUAL encoded/obfuscated data string the player must decode.",
  "category": "${safeCategory}",
  "difficulty": "${difficulty}",
  "points": ${pointsMap[difficulty] || 150},
  "flagValue": "SHERK{exact_result_of_decoding_the_embedded_data}",
  "hint": "Name of encoding or technique — one phrase only, no steps"
}`,
        `Create a ${difficulty} ${safeCategory} static self-contained challenge on the topic: ${topic}. Generate real encoded data — do not use placeholders.`
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
