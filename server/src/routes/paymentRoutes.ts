import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
    checkEnrollment, enrollFree,
    paypalCreateOrder, paypalCaptureOrder,
    mpesaStkPush, mpesaCallback
} from '../controllers/paymentController';

const router = express.Router();

// Check enrollment (protected)
router.get('/check/:courseId', authenticateToken, checkEnrollment);

// Free enrollment
router.post('/enroll-free', authenticateToken, enrollFree);

// PayPal
router.post('/paypal/create', authenticateToken, paypalCreateOrder);
router.post('/paypal/capture', authenticateToken, paypalCaptureOrder);

// M-Pesa
router.post('/mpesa/stkpush', authenticateToken, mpesaStkPush);
router.post('/mpesa/callback', mpesaCallback); // No auth — Safaricom calls this

export default router;
