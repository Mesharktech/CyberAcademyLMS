
import { aiService } from './services/aiService';

async function main() {
    const scenarios = [
        { msg: "Hello Grok", ctx: "" },
        { msg: "I want to learn about this", ctx: "SQL Injection" },
        { msg: "How does this work?", ctx: "Buffer Overflow" },
        { msg: "thanks", ctx: "" },
        { msg: "I am stuck", ctx: "" }
    ];

    for (const s of scenarios) {
        console.log(`User: "${s.msg}" (Context: ${s.ctx})`);
        const res = await aiService.chat(s.msg, s.ctx);
        const content = JSON.parse(res).content;
        console.log(`AI:   ${content}\n-----------------------------------\n`);
    }
}

main();
