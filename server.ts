import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

async function createServer() {
  const app = express();

  // Increase payload limit for large texts
  app.use(express.json({ limit: '50mb' }));

  // Register API routes for LOCAL DEVELOPMENT
  // In production (Vercel), the /api folder is handled automatically as Serverless Functions
  // So we only need this manual routing when running locally with `npm run dev`
  if (!process.env.VERCEL) {
    try {
      const aiModule = await import('./api/ai');
      const aiHandler = aiModule.default;
      
      app.post('/api/gemini', async (req, res) => {
        // @ts-ignore - Vercel types compatibility
        await aiHandler(req as any, res as any);
      });

      app.post('/api/ai', async (req, res) => {
        // @ts-ignore - Vercel types compatibility
        await aiHandler(req as any, res as any);
      });
    } catch (error) {
      console.warn('Could not load local API handler for /api/ai:', error);
    }
  }

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
    });
  })();
}

export default app;
