import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import session from 'express-session';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

declare module 'express-session' {
  interface SessionData {
    tokens: any;
    user: any;
  }
}

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error('Missing Gemini API Key. Please set GOOGLE_API_KEY environment variable.');
}
const ai = new GoogleGenAI({ apiKey });

async function createServer() {
  const app = express();

  app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
  }));

  app.use(express.json({ limit: '50mb' }));

  // Auth routes
  app.get('/api/auth/google', (req, res) => {
    const authorizeUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
    });
    res.json({ url: authorizeUrl });
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await client.getToken(code as string);
      req.session.tokens = tokens;

      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      req.session.user = payload;
      
      res.redirect('/');
    } catch (error) {
      console.error('Authentication error:', error);
      res.redirect('/?auth_error=true');
    }
  });

  app.get('/api/auth/user', (req, res) => {
    if (req.session.user) {
      res.json(req.session.user);
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Could not log out.' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out' });
    });
  });

  // Gemini API routes
  app.post('/api/chat', async (req, res) => {
    if (!apiKey) return res.status(500).json({ error: 'API key not configured.' });
    const { teacher, message, history } = req.body;
    
    try {
      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
            systemInstruction: teacher.prompt,
        },
        history: history.map((msg: any) => ({ role: msg.role, parts: [{ text: msg.text }] })),
      });
      const response = await chat.sendMessage({ message });
      res.json({ text: response.text });
    } catch (error) {
      console.error('Gemini chat error:', error);
      res.status(500).json({ error: 'Failed to get response from Gemini.' });
    }
  });

  app.post('/api/summary', async (req, res) => {
    if (!apiKey) return res.status(500).json({ error: 'API key not configured.' });
    const { teacher, files } = req.body;
    
    try {
            const fileContent = files.map((f: any) => `--- INÍCIO DO ARQUIVO: ${f.name} ---\n\n${f.data}\n\n--- FIM DO ARQUIVO: ${f.name} ---`).join('\n\n');
      const prompt = `Você é um especialista em ${teacher.specialty}. Resuma o seguinte conteúdo de forma concisa e clara:\n\n${fileContent}`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: prompt }] },
      });
      res.json({ text: response.text });
    } catch (error) {
      console.error('Gemini summary error:', error);
      res.status(500).json({ error: 'Failed to get summary from Gemini.' });
    }
  });

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
