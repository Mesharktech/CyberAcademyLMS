import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';
import axios from 'axios';

const prisma = new PrismaClient();

// Use (prisma as any) for enrollment until Prisma client is regenerated with new schema
const db = prisma as any;

// PaymentMethod values (mirrors the Prisma enum)
const PM = { PAYPAL: 'PAYPAL', MPESA: 'MPESA', FREE: 'FREE' } as const;

// ─── Check Enrollment ───────────────────────────────────────────
export const checkEnrollment = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { courseId } = req.params as { courseId: string };
        if (!userId) { res.status(401).json({ enrolled: false }); return; }

        const enrollment = await db.enrollment.findUnique({
            where: { userId_courseId: { userId, courseId } }
        });

        // Admins are always enrolled
        if (req.user?.role === 'ADMIN') {
            res.json({ enrolled: true, method: 'ADMIN' });
            return;
        }

        // Free courses are always accessible
        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (course && Number(course.price) === 0) {
            res.json({ enrolled: true, method: 'FREE' });
            return;
        }

        res.json({
            enrolled: !!enrollment && enrollment.status === 'COMPLETED',
            enrollment: enrollment || null
        });
    } catch (error) {
        console.error('Check enrollment error:', error);
        res.status(500).json({ error: 'Failed to check enrollment' });
    }
};

// ─── Enroll Free ─────────────────────────────────────────────────
export const enrollFree = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { courseId } = req.body;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course) { res.status(404).json({ error: 'Course not found' }); return; }
        if (Number(course.price) > 0) {
            res.status(400).json({ error: 'This course requires payment' });
            return;
        }

        const enrollment = await db.enrollment.upsert({
            where: { userId_courseId: { userId, courseId } },
            update: {},
            create: {
                userId, courseId,
                paymentMethod: PM.FREE,
                amountPaid: 0,
                status: 'COMPLETED'
            }
        });
        res.json({ success: true, enrollment });
    } catch (error) {
        console.error('Free enroll error:', error);
        res.status(500).json({ error: 'Failed to enroll' });
    }
};

// ─── PayPal: Create Order ────────────────────────────────────────
export const paypalCreateOrder = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { courseId } = req.body;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course) { res.status(404).json({ error: 'Course not found' }); return; }

        const clientId = process.env.PAYPAL_CLIENT_ID;
        const secret = process.env.PAYPAL_SECRET;
        const baseUrl = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

        if (!clientId || !secret) {
            // Sandbox mock for development
            const mockOrderId = `MOCK-${Date.now()}`;
            res.json({ orderId: mockOrderId, mock: true, amount: Number(course.price) });
            return;
        }

        // Get PayPal access token
        const authResp = await axios.post(`${baseUrl}/v1/oauth2/token`, 'grant_type=client_credentials', {
            auth: { username: clientId, password: secret },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const accessToken = authResp.data.access_token;

        // Create order
        const orderResp = await axios.post(`${baseUrl}/v2/checkout/orders`, {
            intent: 'CAPTURE',
            purchase_units: [{
                amount: { currency_code: 'USD', value: Number(course.price).toFixed(2) },
                description: course.title
            }]
        }, {
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
        });

        res.json({ orderId: orderResp.data.id, amount: Number(course.price) });
    } catch (error: any) {
        console.error('PayPal create order error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to create PayPal order' });
    }
};

// ─── PayPal: Capture Order ───────────────────────────────────────
export const paypalCaptureOrder = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { courseId, orderId } = req.body;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course) { res.status(404).json({ error: 'Course not found' }); return; }

        const clientId = process.env.PAYPAL_CLIENT_ID;
        const secret = process.env.PAYPAL_SECRET;
        const baseUrl = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

        if (!clientId || !secret) {
            // Mock mode: just create the enrollment
            const enrollment = await db.enrollment.upsert({
                where: { userId_courseId: { userId, courseId } },
                update: { status: 'COMPLETED', transactionId: orderId },
                create: {
                    userId, courseId,
                    paymentMethod: PM.PAYPAL,
                    transactionId: orderId,
                    amountPaid: Number(course.price),
                    status: 'COMPLETED'
                }
            });
            res.json({ success: true, enrollment, mock: true });
            return;
        }

        // Capture the PayPal order
        const authResp = await axios.post(`${baseUrl}/v1/oauth2/token`, 'grant_type=client_credentials', {
            auth: { username: clientId, password: secret },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const captureResp = await axios.post(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {}, {
            headers: { Authorization: `Bearer ${authResp.data.access_token}`, 'Content-Type': 'application/json' }
        });

        if (captureResp.data.status === 'COMPLETED') {
            const enrollment = await db.enrollment.upsert({
                where: { userId_courseId: { userId, courseId } },
                update: { status: 'COMPLETED', transactionId: orderId },
                create: {
                    userId, courseId,
                    paymentMethod: PM.PAYPAL,
                    transactionId: orderId,
                    amountPaid: Number(course.price),
                    status: 'COMPLETED'
                }
            });
            res.json({ success: true, enrollment });
        } else {
            res.status(400).json({ error: 'Payment not completed' });
        }
    } catch (error: any) {
        console.error('PayPal capture error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to capture PayPal payment' });
    }
};

// ─── M-Pesa: STK Push ────────────────────────────────────────────
export const mpesaStkPush = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { courseId, phoneNumber } = req.body;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course) { res.status(404).json({ error: 'Course not found' }); return; }

        const consumerKey = process.env.MPESA_CONSUMER_KEY;
        const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
        const shortCode = process.env.MPESA_SHORTCODE || '174379';
        const passkey = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
        const callbackUrl = process.env.MPESA_CALLBACK_URL || 'https://your-server.com/api/payments/mpesa/callback';
        const baseUrl = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke';

        if (!consumerKey || !consumerSecret) {
            // Mock mode for development
            const mockReceipt = `MOCK-MPESA-${Date.now()}`;
            const enrollment = await db.enrollment.upsert({
                where: { userId_courseId: { userId, courseId } },
                update: { status: 'COMPLETED', transactionId: mockReceipt, paymentMethod: PM.MPESA },
                create: {
                    userId, courseId,
                    paymentMethod: PM.MPESA,
                    transactionId: mockReceipt,
                    amountPaid: Number(course.price),
                    status: 'COMPLETED'
                }
            });
            res.json({ success: true, mock: true, checkoutRequestId: mockReceipt, enrollment });
            return;
        }

        // Get M-Pesa OAuth token
        const authResp = await axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
            auth: { username: consumerKey, password: consumerSecret }
        });
        const token = authResp.data.access_token;

        // Generate timestamp and password
        const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
        const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');

        // Clean phone number: ensure 254 prefix
        let phone = phoneNumber.replace(/\s+/g, '').replace(/^\+/, '');
        if (phone.startsWith('0')) phone = '254' + phone.slice(1);

        // Convert USD to KES (approximate rate)
        const kshAmount = Math.ceil(Number(course.price) * 130);

        // STK Push request
        const stkResp = await axios.post(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
            BusinessShortCode: shortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: kshAmount,
            PartyA: phone,
            PartyB: shortCode,
            PhoneNumber: phone,
            CallBackURL: callbackUrl,
            AccountReference: `SHERK-${courseId.slice(0, 8)}`,
            TransactionDesc: `Payment for ${course.title}`
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // Create PENDING enrollment
        await db.enrollment.upsert({
            where: { userId_courseId: { userId, courseId } },
            update: { status: 'PENDING', paymentMethod: PM.MPESA },
            create: {
                userId, courseId,
                paymentMethod: PM.MPESA,
                transactionId: stkResp.data.CheckoutRequestID,
                amountPaid: Number(course.price),
                status: 'PENDING'
            }
        });

        res.json({
            success: true,
            checkoutRequestId: stkResp.data.CheckoutRequestID,
            message: 'STK Push sent. Check your phone.'
        });
    } catch (error: any) {
        console.error('M-Pesa STK push error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to initiate M-Pesa payment' });
    }
};

// ─── M-Pesa: Callback ────────────────────────────────────────────
export const mpesaCallback = async (req: any, res: Response) => {
    try {
        const body = req.body?.Body?.stkCallback;
        if (!body) { res.json({ ResultCode: 0, ResultDesc: 'Accepted' }); return; }

        const resultCode = body.ResultCode;
        const checkoutRequestId = body.CheckoutRequestID;

        if (resultCode === 0) {
            // Payment successful
            const metadata = body.CallbackMetadata?.Item || [];
            const receipt = metadata.find((m: any) => m.Name === 'MpesaReceiptNumber')?.Value;

            await db.enrollment.updateMany({
                where: { transactionId: checkoutRequestId },
                data: { status: 'COMPLETED', transactionId: receipt || checkoutRequestId }
            });
        } else {
            await db.enrollment.updateMany({
                where: { transactionId: checkoutRequestId },
                data: { status: 'FAILED' }
            });
        }

        res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    } catch (error) {
        console.error('M-Pesa callback error:', error);
        res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }
};
