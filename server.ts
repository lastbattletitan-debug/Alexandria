import express from 'express';
import path from 'path';

import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();





const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error('Missing Gemini API Key. Please set GOOGLE_API_KEY environment variable.');
}
const ai = new GoogleGenAI({ apiKey });

async function createServer() {
  const app = express();



  app.use(express.json({ limit: '50mb' }));



  // Gemini API routes removed - handled in frontend services/gemini.ts

  app.get('/api/check-plan', async (req, res) => {
    if (!apiKey) return res.json({ plan: 'Desconhecido' });
    try {
      await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: 'test' }] },
      });
      res.json({ plan: 'Pro' });
    } catch (error) {
      res.json({ plan: 'Standard' });
    }
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
