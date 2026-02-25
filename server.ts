import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

// Import the Vercel handler for local usage
// We need to use require or dynamic import if it's a TS file, but since we are running with tsx, import is fine.
// However, api/gemini.ts exports default.
import geminiHandler from './api/gemini';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

async function createServer() {
  const app = express();

  // Increase payload limit for large texts
  app.use(express.json({ limit: '50mb' }));

  // Register API routes
  // Adapter to make Express req/res compatible with Vercel handler if needed
  app.post('/api/gemini', async (req, res) => {
    // @ts-ignore - Vercel types are compatible enough with Express for this simple handler
    // But we need to cast req/res to any because VercelRequest adds properties that Express Request might not have explicitly typed here
    await geminiHandler(req as any, res as any);
  });

  app.get('/api/check-plan', async (req, res) => {
    if (!apiKey) return res.json({ plan: 'Desconhecido' });
    // Mock check
    res.json({ plan: 'Pro' });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const buildPath = path.resolve(__dirname, 'dist');
    app.use(express.static(buildPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  }

  return app;
}

const app = createServer();

// Only run the server locally
if (!process.env.VERCEL) {
  (async () => {
    const server = await app;
    const PORT = 3000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  })();
}

export default app;
