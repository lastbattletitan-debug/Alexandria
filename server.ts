import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

async function createServer() {
  const app = express();

  // Increase payload limit for large texts
  app.use(express.json({ limit: '50mb' }));

  // Register API routes
  try {
    const aiModule = await import('./api/ai.ts').catch(() => import('./api/ai.js')).catch(() => import('./api/ai'));
    const aiHandler = (aiModule as any).default;
    
    if (aiHandler) {
      app.post('/api/gemini', async (req, res) => {
        await aiHandler(req as any, res as any);
      });

      app.post('/api/ai', async (req, res) => {
        await aiHandler(req as any, res as any);
      });
    }

    // Backend Routes for RAG and PDF processing
    const backendRoutes = await import('./server/routes.ts').catch(() => import('./server/routes.js')).catch(() => import('./server/routes'));
    const routesHandler = (backendRoutes as any).default;
    if (routesHandler) {
      app.use('/api', routesHandler);
    }
  } catch (error) {
    console.warn('Could not load local API handlers:', error);
  }

  app.get('/api/check-plan', async (req, res) => {
    if (!apiKey) return res.json({ plan: 'Desconhecido' });
    res.json({ plan: 'Pro' });
  });

  // Vite middleware in development or static dist in production
  const distPath = path.resolve(__dirname, 'dist');
  const distIndexHtml = path.resolve(distPath, 'index.html');
  const hasBuild = fs.existsSync(distIndexHtml);

  if (process.env.NODE_ENV === 'production' && hasBuild) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(distIndexHtml);
    });
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      if (hasBuild) {
        app.use(express.static(distPath));
        app.get('*', (_req, res) => {
          res.sendFile(distIndexHtml);
        });
      } else {
        console.error('Vite dev server failed to start and dist/index.html does not exist:', e);
      }
    }
  }

  return app;
}

const appPromise = createServer();

if (!process.env.VERCEL) {
  (async () => {
    const server = await appPromise;
    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })();
}

export default appPromise;

