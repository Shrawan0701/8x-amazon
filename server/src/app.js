import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import { attachUser } from './middleware/auth.js';
import { aiRouter } from './routes/ai.js';
import { authRouter } from './routes/auth.js';
import { cartRouter } from './routes/cart.js';
import { ordersRouter } from './routes/orders.js';
import { productsRouter } from './routes/products.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(attachUser);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'aurora-market-api' });
});

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/ai', aiRouter);

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
});
