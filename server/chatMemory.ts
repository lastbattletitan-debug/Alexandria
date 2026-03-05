interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

const memory: Record<string, ChatMessage[]> = {};

export function adicionarAoHistorico(sessionId: string, role: 'user' | 'model', content: string) {
  if (!memory[sessionId]) {
    memory[sessionId] = [];
  }
  
  memory[sessionId].push({ role, content });
  
  // Keep only the last 10 messages
  if (memory[sessionId].length > 10) {
    memory[sessionId] = memory[sessionId].slice(-10);
  }
}

export function obterHistorico(sessionId: string) {
  return memory[sessionId] || [];
}

export function limparHistorico(sessionId: string) {
  delete memory[sessionId];
}
