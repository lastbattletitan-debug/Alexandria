import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Send, FileText, Loader2, BookOpen, Link as LinkIcon, Upload, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Teacher, ChatMessage, TeacherFile } from '../types';
import { chatWithTeacher, generateSummary } from '../services/gemini';

interface TeacherChatProps {
  teacher: Teacher;
  onBack: () => void;
  onAddMessage: (teacherId: string, message: Omit<ChatMessage, 'id'>) => void;
  onAddFile: (teacherId: string, file: Omit<TeacherFile, 'id'>) => void;
  onClearChat: () => void;
}

export function TeacherChat({ teacher, onBack, onAddMessage, onAddFile, onClearChat }: TeacherChatProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [teacher.chatHistory]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    onAddMessage(teacher.id, { role: 'user', text: userMessage });
    
    setIsLoading(true);
    try {
      const responseText = await chatWithTeacher(teacher, userMessage, teacher.chatHistory);
      onAddMessage(teacher.id, { role: 'model', text: responseText });
    } catch (error) {
      console.error(error);
      onAddMessage(teacher.id, { role: 'model', text: 'Desculpe, ocorreu um erro ao processar sua mensagem.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`O arquivo ${file.name} é muito grande. O limite é 5MB por arquivo.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Data = (event.target?.result as string).split(',')[1];
          if (base64Data) {
            onAddFile(teacher.id, {
              name: file.name,
              mimeType: file.type || 'application/octet-stream',
              data: base64Data,
              type: 'file'
            });
            
            onAddMessage(teacher.id, {
              role: 'user',
              text: `[Arquivo adicionado à base de conhecimento: ${file.name}]`,
            });
          }
        } catch (error) {
          console.error('Erro ao processar arquivo', error);
          alert(`Erro ao processar o arquivo ${file.name}`);
        }
      };
      reader.readAsDataURL(file);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl) return;

    onAddFile(teacher.id, {
      name: linkName || linkUrl,
      mimeType: 'text/uri-list',
      url: linkUrl,
      type: 'link'
    });

    onAddMessage(teacher.id, {
      role: 'user',
      text: `[Link adicionado à base de conhecimento: ${linkUrl}]`,
    });

    setLinkUrl('');
    setLinkName('');
    setIsLinkModalOpen(false);
  };

  const handleSummary = async () => {
    if (teacher.files.length === 0) {
      alert('Nenhuma fonte adicionada para este professor ainda. Adicione arquivos ou links para gerar um sumário.');
      return;
    }

    setIsSummarizing(true);
    try {
      const summaryText = await generateSummary(teacher);
      onAddMessage(teacher.id, {
        role: 'model',
        text: `**Sumário das Fontes:**\n\n${summaryText}`,
      });
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar sumário.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleClearChat = () => {
    setIsClearModalOpen(true);
  };

  const confirmClearChat = () => {
    onClearChat();
    setIsClearModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <img
              src={teacher.imageUrl}
              alt={teacher.name}
              className="w-10 h-10 rounded-full object-cover border border-stone-200"
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="font-serif font-bold text-stone-900 leading-tight">{teacher.name}</h2>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">{teacher.role}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            className="flex items-center gap-2 text-stone-500 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-full text-sm font-medium transition-colors"
            title="Limpar Chat"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">Limpar Chat</span>
          </button>
          <button
            onClick={handleSummary}
            disabled={isSummarizing || teacher.files.length === 0}
            className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSummarizing ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
            <span className="hidden sm:inline">Gerar Sumário</span>
            <span className="sm:hidden">Sumário</span>
          </button>
        </div>
      </header>

      {/* Sources Bar */}
      <div className="bg-white border-b border-stone-200 px-4 py-3 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
            <BookOpen size={14} /> Fontes ({teacher.files.length})
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,text/*,application/pdf"
              multiple
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-full transition-colors"
            >
              <Upload size={14} /> Upload Arquivos
            </button>
            <button
              onClick={() => setIsLinkModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-full transition-colors"
            >
              <LinkIcon size={14} /> Adicionar Link
            </button>
          </div>
        </div>
        
        {teacher.files.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-stone-200">
            {teacher.files.map((file) => (
              <div key={file.id} className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-700 whitespace-nowrap shrink-0">
                {file.type === 'link' ? <LinkIcon size={12} className="text-blue-500" /> : <FileText size={12} className="text-orange-500" />}
                <span className="max-w-[150px] truncate" title={file.name}>{file.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {teacher.chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-4">
            <div className="w-24 h-24 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden">
              <img src={teacher.imageUrl} alt="" className="w-full h-full object-cover opacity-50 grayscale" referrerPolicy="no-referrer" />
            </div>
            <p className="text-center max-w-sm">
              Envie uma mensagem para começar a conversar com {teacher.name}. Adicione fontes acima para que o professor as utilize como base de conhecimento.
            </p>
          </div>
        ) : (
          teacher.chatHistory.map((msg, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id || idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-4 ${
                  msg.role === 'user'
                    ? 'bg-stone-900 text-white rounded-tr-sm'
                    : 'bg-white border border-stone-200 text-stone-800 rounded-tl-sm shadow-sm'
                }`}
              >
                {msg.role === 'model' ? (
                  <div className="prose prose-sm prose-stone max-w-none">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                )}
              </div>
            </motion.div>
          ))
        )}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center gap-2 text-stone-500">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm font-medium">Digitando...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-stone-200 p-4 shrink-0">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Pergunte algo ao professor..."
              className="w-full bg-stone-100 border-transparent focus:bg-white focus:border-stone-300 focus:ring-0 rounded-2xl py-3 pl-4 pr-12 resize-none max-h-32 min-h-[52px] transition-all"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 p-2 text-white bg-stone-900 rounded-xl hover:bg-stone-800 disabled:opacity-50 disabled:bg-stone-300 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>

      {/* Clear Chat Modal */}
      <AnimatePresence>
        {isClearModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-stone-100">
                <h2 className="text-xl font-serif font-bold text-stone-900">Limpar Chat</h2>
              </div>
              <div className="p-6">
                <p className="text-stone-600 mb-6">
                  Tem certeza que deseja limpar todo o histórico de chat com <strong>{teacher.name}</strong>? Esta ação não pode ser desfeita.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsClearModalOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmClearChat}
                    className="flex-1 px-4 py-3 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Link Modal */}
      <AnimatePresence>
        {isLinkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-stone-100">
                <h2 className="text-xl font-serif font-bold text-stone-900">Adicionar Link</h2>
              </div>
              <form onSubmit={handleAddLink} className="p-6 flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">URL do Link</label>
                  <input
                    type="url"
                    required
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Nome (Opcional)</label>
                  <input
                    type="text"
                    value={linkName}
                    onChange={(e) => setLinkName(e.target.value)}
                    placeholder="Ex: Artigo sobre IA"
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsLinkModalOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!linkUrl}
                    className="flex-1 px-4 py-3 rounded-xl font-medium text-white bg-stone-900 hover:bg-stone-800 transition-colors disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
