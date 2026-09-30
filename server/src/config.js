import dotenv from 'dotenv';

dotenv.config();

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5174';

const clientUrls = (process.env.CLIENT_URLS || clientUrl)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const nodeEnv = process.env.NODE_ENV || 'development';

export const config = {
  nodeEnv,
  port: Number(process.env.PORT || 5000),

  clientUrl,
  clientUrls,

  databaseUrl: process.env.DATABASE_URL,

  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',

  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',

  brevoApiKey: process.env.BREVO_API_KEY || '',
  brevoSenderEmail: process.env.BREVO_SENDER_EMAIL || 'orders@example.com',
  brevoSenderName: process.env.BREVO_SENDER_NAME || 'Aurora Market',

  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',

  openaiApiKey: process.env.OPENAI_API_KEY || ''
};
