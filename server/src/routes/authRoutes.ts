import express from 'express';
import { register, login, verifyEmail, googleLogin } from '../controllers/authController';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/google', googleLogin);

export default router;
