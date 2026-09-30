import express from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { config } from '../config.js';
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

const categoryAliases = [
  { slug: 'footwear', words: ['shoe', 'shoes', 'sneaker', 'sneakers', 'runner', 'running'] },
  { slug: 'audio', words: ['headphone', 'headphones', 'earbud', 'earbuds', 'audio', 'speaker'] },
  { slug: 'home-tech', words: ['lamp', 'lighting', 'air fryer', 'kitchen', 'home'] },
  { slug: 'travel', words: ['backpack', 'bag', 'luggage', 'travel', 'spinner'] },
  { slug: 'fitness', words: ['dumbbell', 'massage', 'fitness', 'weights', 'recovery'] }
];

function isEmptyTranscript(text) {
  const normalized = String(text || '').trim().toLowerCase();
  if (normalized.length < 2) return true;
  return ['.', '..', '...', 'you', 'thank you', 'thanks'].includes(normalized);
}

function normalizeIntent(intent, transcript) {
  const text = String(transcript || '').trim();
  const lower = text.toLowerCase();
  const normalized = { ...intent };

  if (normalized.category) {
    const category = String(normalized.category).toLowerCase();
    const match = categoryAliases.find((item) => item.slug === category || item.words.includes(category));
    normalized.category = match?.slug || category;
  }

  const aliasMatch = categoryAliases.find((item) => item.words.some((word) => lower.includes(word)));
  if (normalized.intent === 'search_products' && aliasMatch && !normalized.category) {
    normalized.category = aliasMatch.slug;
  }

  if (normalized.intent === 'search_products' && !normalized.query && !normalized.category && !normalized.brand && !normalized.maxPrice && !normalized.minPrice && text) {
    normalized.query = text;
  }

  return normalized;
}

function hasActionableIntent(intent) {
  if (intent.intent === 'view_cart') return true;
  if (intent.intent === 'search_products') {
    return Boolean(intent.query || intent.category || intent.brand || intent.maxPrice || intent.minPrice || intent.sort);
  }
  if (intent.intent === 'open_product' || intent.intent === 'add_to_cart') return Boolean(intent.productName);
  return false;
}

aiRouter.post('/voice-intent', upload.single('audio'), asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Audio file is required.');
  const file = new File([req.file.buffer], req.file.originalname || 'voice.webm', { type: req.file.mimetype });
  const transcription = await client().audio.transcriptions.create({ model: 'gpt-4o-mini-transcribe', file });
  const transcript = String(transcription.text || '').trim();
  if (isEmptyTranscript(transcript)) throw new HttpError(400, 'I did not catch a shopping request. Please try again.');
  const intent = normalizeIntent(await extractIntent(transcript), transcript);
  if (!hasActionableIntent(intent)) throw new HttpError(400, 'I could not turn that into a shopping action. Try saying "show me shoes" or "headphones under 3000".');
  res.json({ transcript, intent });
}));

aiRouter.post('/text-intent', express.json(), asyncHandler(async (req, res) => {
  const text = String(req.body?.text || '').trim();
  if (!text) throw new HttpError(400, 'Text is required.');
  const intent = normalizeIntent(await extractIntent(text), text);
  if (!hasActionableIntent(intent)) throw new HttpError(400, 'I could not turn that into a shopping action. Try "show me shoes" or "headphones under 3000".');
  res.json({ transcript: text, intent });
}));
