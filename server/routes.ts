import { Router } from 'express';
import multer from 'multer';
import { ingestPDF, teacherKnowledge } from './pdfProcessor';
import { responderPergunta } from './brain';
import { limparHistorico } from './chatMemory';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/upload/:professorId
router.post('/upload/:professorId', upload.single('pdf'), async (req, res) => {
  try {
    const { professorId } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const result = await ingestPDF(professorId, req.file.buffer);
    res.json(result);
  } catch (error: any) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chat
router.post('/chat', async (req, res) => {
  try {
    const { professorId, sessionId, pergunta } = req.body;
    if (!professorId || !sessionId || !pergunta) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
    }

    const result = await responderPergunta(professorId, sessionId, pergunta);
    res.json(result);
  } catch (error: any) {
    console.error('Erro no chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/historico/:sessionId
router.delete('/historico/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    limparHistorico(sessionId);
    res.json({ sucesso: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/status/:professorId
router.get('/status/:professorId', (req, res) => {
  try {
    const { professorId } = req.params;
    const knowledge = teacherKnowledge[professorId];
    
    res.json({
      carregado: !!knowledge,
      chunks: knowledge ? knowledge.chunks.length : 0
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
