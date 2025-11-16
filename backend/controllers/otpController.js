import prisma from '../config/db.js';       
import crypto from 'crypto';                 
import { sendSms } from './smsController.js'; 
export const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000);
    const user = await prisma.user.updateMany({
      where: { phone },
      data: { otpCode: otp, otpExpiry: expiryTime },
    });
    if (user.count === 0) {
      return res.status(404).json({ message: 'User not found with this phone number.' });
    }
    await sendSms(phone, `Your FlightBridge verification code is ${otp}`);
    res.json({ message: 'OTP sent successfully.' });

  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Something went wrong while sending OTP.' });
  }
};
export const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body; 
    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required.' });
    }
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (user.otpCode !== otp) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }
    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }
    await prisma.user.update({
      where: { phone },
      data: {
        phoneVerified: true,
        otpCode: null,
        otpExpiry: null,
      },
    });
    res.json({ message: 'Phone number verified successfully.' });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Something went wrong during verification.' });
  }
};
