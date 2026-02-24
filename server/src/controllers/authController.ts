import { Request, Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendVerificationEmail } from '../services/emailService';

const prisma = new PrismaClient();

// Register new user
export const register = async (req: Request, res: Response) => {
    try {
        const { email, username, password, firstName, lastName } = req.body;

        if (!email || !username || !password) {
            res.status(400).json({ error: 'Email, username, and password are required' });
            return;
        }

        // Enforce strict password complexity (8+ chars, upper, lower, number, special)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            res.status(400).json({ error: 'SECURITY POLICY FAILURE: Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (e.g., @$!%*?&).' });
            return;
        }

        // Check if user exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }]
            }
        });

        if (existingUser) {
            res.status(409).json({ error: 'User with that email or username already exists' });
            return;
        }

        // Hash password
        const passwordHash = await argon2.hash(password);

        // Generate a secure verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Create user (Default role: LEARNER, isEmailVerified: false)
        const newUser = await prisma.user.create({
            data: {
                email,
                username,
                passwordHash,
                firstName,
                lastName,
                role: UserRole.LEARNER,
                verificationToken
            }
        });

        // Dispatch verification email
        await sendVerificationEmail(newUser.email, verificationToken);

        // Do not auto-login; mandate verification first.
        res.status(201).json({
            message: 'Identity registered successfully. Please check your secure email to verify your account and complete clearance.',
            requiresVerification: true
        });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Internal server error during registration' });
    }
};

// Login user
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }

        // Find user
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Check Email Verification Gate
        if (!user.isEmailVerified) {
            res.status(403).json({ error: 'ACCESS DENIED: Email verification pending. Please check your inbox and verify your identity.' });
            return;
        }

        // Verify password
        const validPassword = await argon2.verify(user.passwordHash, password);

        if (!validPassword) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        });

        // Generate Token
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
                xp: user.xp,
                rank: user.rank
            },
            token
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Internal server error during login' });
    }
};

// Verify Email
export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const { token } = req.query;

        if (!token || typeof token !== 'string') {
            res.status(400).json({ error: 'Invalid verification token' });
            return;
        }

        const user = await prisma.user.findFirst({
            where: { verificationToken: token }
        });

        if (!user) {
            res.status(400).json({ error: 'Invalid or expired verification token' });
            return;
        }

        // Update user state
        await prisma.user.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                verificationToken: null // Burn the token
            }
        });

        // Redirect user to the frontend login page with a success message
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/login?verified=true`);

    } catch (error) {
        console.error('Email Verification Error:', error);
        res.status(500).json({ error: 'Internal server error during verification' });
    }
};
