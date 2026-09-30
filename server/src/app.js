import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import serveStatic from 'serve-static';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { attachUser } from './middleware/auth.js';
import { accountRouter } from './routes/account.js';
import { aiRouter } from './routes/ai.js';
import { authRouter } from './routes/auth.js';
import { cartRouter } from './routes/cart.js';
import { ordersRouter } from './routes/orders.js';
import { productsRouter } from './routes/products.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

app.use(helmet());
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (config.clientUrls.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  }
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(attachUser);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'aurora-market-api' });
});

app.use('/api/auth', authRouter);
app.use('/api/account', accountRouter);
app.use('/api/products', productsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/ai', aiRouter);

if (config.nodeEnv === 'production') {
  app.use(serveStatic(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ message: `No route for ${req.method} ${req.path}` });
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({
    message: error.message || 'Something went wrong.',
    details: error.details || null
  });
});

app.listen(config.port, () => {
  console.log(`Aurora Market API running on http://localhost:${config.port}`);
  console.log(`CORS allowed origins: ${config.clientUrls.join(', ')}`);
});
