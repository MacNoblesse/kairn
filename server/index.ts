import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { aiRouter } from './ai';
import { StateStore } from './stateStore';
import { createStateRouter } from './stateRoutes';

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'));
const STATIC_DIR = path.resolve(process.env.STATIC_DIR || path.join(process.cwd(), 'dist'));

const store = new StateStore(DATA_DIR);
const app = express();

app.get('/api/health', (_req, res) => {
  const writable = store.isWritable();
  res.status(writable ? 200 : 503).json({ ok: writable, dataDir: DATA_DIR, dataWritable: writable });
});

// CORS : l'APK Android appelle l'API depuis l'origine https://localhost (WebView Capacitor).
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? 'https://localhost,capacitor://localhost,http://localhost')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.set({
      'Access-Control-Allow-Origin': origin,
      Vary: 'Origin',
      'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
    });
  }
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Doit précéder le parseur JSON global (1 Mo) : l'état est plus gros.
app.use('/api/state', createStateRouter(store));

app.use(express.json({ limit: '1mb' }));
app.use('/api/ai', aiRouter);

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(STATIC_DIR));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(STATIC_DIR, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kairn : http://localhost:${PORT}  ·  données : ${DATA_DIR}`);
  });
}

start();
