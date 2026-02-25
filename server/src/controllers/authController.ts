import { Request, Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendVerificationEmail } from '../services/emailService';
import * as admin from 'firebase-admin';

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

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Create user (Default role: LEARNER, isEmailVerified: false)
        const newUser = await prisma.user.create({
            data: {
                email,
                username,
                passwordHash,
                firstName,
                lastName,
                role: UserRole.LEARNER,
                verificationCode
            }
        });

        // Dispatch verification email
        await sendVerificationEmail(newUser.email, verificationCode);

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

        // Find user by either email or username
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email },
                    { username: email }
                ]
            }
        });

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

// Verify Email OTP Code
export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const { email, code } = req.body;

        if (!email || !code || typeof code !== 'string') {
            res.status(400).json({ error: 'Email and verification code are required' });
            return;
        }

        const user = await prisma.user.findFirst({
            where: { email, verificationCode: code }
        });

        if (!user) {
            res.status(400).json({ error: 'Invalid or expired verification code' });
            return;
        }

        // Update user state
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                verificationCode: null // Burn the code
            }
        });

        // Generate Token and automatically log them in
        const token = jwt.sign(
            { userId: updatedUser.id, role: updatedUser.role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Identity verified successfully',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                username: updatedUser.username,
                role: updatedUser.role,
                xp: updatedUser.xp,
                rank: updatedUser.rank
            },
            token
        });

    } catch (error) {
        console.error('Email Verification Error:', error);
        res.status(500).json({ error: 'Internal server error during verification' });
    }
};

// Initialize Firebase Admin (will fail gracefully if credentials aren't set yet)
try {
    if (process.env.FIREBASE_PROJECT_ID) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    }
} catch (error) {
    console.error('Firebase Admin Initialization Error:', error);
}

// Google Login
export const googleLogin = async (req: Request, res: Response) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            res.status(400).json({ error: 'Google ID token is required' });
            return;
        }

        if (!admin.apps.length) {
            res.status(500).json({ error: 'Firebase Admin is not configured on the server. Please add credentials.' });
            return;
        }

        // Verify the token with Firebase
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { email, name, uid } = decodedToken;

        if (!email) {
            res.status(400).json({ error: 'No email found in Google payload' });
            return;
        }

        // Find or create user
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            // Create user automatically (they are inherently verified by Google)
            const firstName = name ? name.split(' ')[0] : 'Operative';
            const lastName = name ? name.split(' ').slice(1).join(' ') : 'Unknown';

            // Generate a friendlier username from email
            let baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            if (!baseUsername) baseUsername = 'user';

            let username = baseUsername;
            let counter = 1;
            while (await prisma.user.findUnique({ where: { username } })) {
                username = `${baseUsername}${counter}`;
                counter++;
            }

            // We don't need to cryptographically hash a dummy password, it wastes 1s of server time during signup.
            // The uid + secret is already secure enough to satisfy the db schema.
            const passwordHash = `GoogleOAuth_${uid}_${Date.now()}`;

            user = await prisma.user.create({
                data: {
                    email,
                    username,
                    firstName,
                    lastName,
                    passwordHash,
                    role: UserRole.LEARNER,
                    isEmailVerified: true // Trust Google
                }
            });
        }

        // Generate our JWT
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Google login successful',
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
        console.error('Google Login Error:', error);
        res.status(500).json({ error: 'Google authentication failed' });
    }
};
