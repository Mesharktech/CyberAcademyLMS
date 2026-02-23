import express from 'express';
import { aiService } from '../services/aiService';

const router = express.Router();

// Middleware to check auth would go here (skipped for MVP foundation step)

router.post('/mentor/feedback', async (req, res) => {
    try {
        const { content, context } = req.body;
        if (!content) {
            res.status(400).json({ error: 'Content is required' });
            return;
        }
        const result = await aiService.analyzeSubmission(content, context);
        // Attempt to parse JSON response from AI, or return raw if not valid JSON
        try {
            const parsed = JSON.parse(result);
            res.json(parsed);
        } catch {
            res.json({ feedback: result });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/scenarios/daily', async (req, res) => {
    try {
        const result = await aiService.generateDailyScenario();
        try {
            const parsed = JSON.parse(result);
            res.json(parsed);
        } catch {
            res.json({ scenario: result });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/chat', async (req, res) => {
    try {
        const { message, context } = req.body;
        if (!message) {
            res.status(400).json({ error: "Message is required" });
            return;
        }
        const result = await aiService.chat(message, context);
        try {
            const parsed = JSON.parse(result);
            res.json(parsed);
        } catch {
            res.json({ content: result });
        }
    } catch (error) {
        res.status(500).json({ error: 'AI Communication Failure' });
    }
});

export default router;
