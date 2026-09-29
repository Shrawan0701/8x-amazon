import express from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError, requireEnv } from '../utils/http.js';

export const aiRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const intentSchema = {
  name: 'voice_shopping_intent',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      intent: { type: 'string', enum: ['search_products', 'open_product', 'add_to_cart', 'view_cart'] },
      query: { type: ['string', 'null'] },
      category: { type: ['string', 'null'] },
      brand: { type: ['string', 'null'] },
      maxPrice: { type: ['number', 'null'] },
      minPrice: { type: ['number', 'null'] },
      sort: { type: ['string', 'null'], enum: ['price_asc', 'price_desc', 'rating', 'newest', null] },
      productName: { type: ['string', 'null'] },
      quantity: { type: ['number', 'null'] }
    },
    required: ['intent', 'query', 'category', 'brand', 'maxPrice', 'minPrice', 'sort', 'productName', 'quantity']
  }
};

function client() {
  requireEnv('OPENAI_API_KEY', config.openaiApiKey);
  return new OpenAI({ apiKey: config.openaiApiKey });
}

async function extractIntent(transcript) {
  const response = await client().responses.create({
    model: 'gpt-5-mini',
    input: [
      { role: 'system', content: 'Extract a safe shopping intent. Never invent database IDs. Use null for missing fields.' },
      { role: 'user', content: transcript }
    ],
    text: { format: { type: 'json_schema', ...intentSchema } }
  });
  return JSON.parse(response.output_text);
}

aiRouter.post('/voice-intent', requireAuth, upload.single('audio'), asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Audio file is required.');
  const file = new File([req.file.buffer], req.file.originalname || 'voice.webm', { type: req.file.mimetype });
  const transcription = await client().audio.transcriptions.create({ model: 'gpt-4o-mini-transcribe', file });
  const transcript = transcription.text;
  const intent = await extractIntent(transcript);
  res.json({ transcript, intent });
}));

aiRouter.post('/text-intent', requireAuth, express.json(), asyncHandler(async (req, res) => {
  const text = String(req.body?.text || '').trim();
  if (!text) throw new HttpError(400, 'Text is required.');
  const intent = await extractIntent(text);
  res.json({ transcript: text, intent });
}));
