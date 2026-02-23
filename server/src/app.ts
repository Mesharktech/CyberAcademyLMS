import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

const app = express();

// Middleware
app.use(helmet());
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'capacitor://localhost', 'http://localhost'];

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(null, true); // Permissive for MVP/local dev
        }
        return callback(null, origin);
    },
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

import authRoutes from './routes/authRoutes';
import aiRoutes from './routes/aiRoutes';
import labRoutes from './routes/labRoutes';

import courseRoutes from './routes/courseRoutes';
import paymentRoutes from './routes/paymentRoutes';
import userRoutes from './routes/userRoutes';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
