import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Send, FileText, Loader2, BookOpen, Link as LinkIcon, Trash2, Brain, Bookmark, ChevronDown } from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import { Teacher, ChatMessage, TeacherFile, Topic } from '../types';
import { chatWithTeacher, generateSummary } from '../services/aiService';

interface TeacherChatProps {
  teacher: Teacher;
  currentTopic?: Topic;
  onBack: () => void;
  onAddMessage: (teacherId: string, message: Omit<ChatMessage, 'id'>) => void;
  onAddFile: (teacherId: string, file: Omit<TeacherFile, 'id'>) => void;
  onRemoveFile: (teacherId: string, fileId: string) => void;
  onClearChat: () => void;
  onOpenBrain: () => void;
  onOpenTopics: () => void;
}

export function TeacherChat({ 
  teacher, 
  currentTopic,
  onBack, 
  onAddMessage, 
  onAddFile,
  onRemoveFile,
  onClearChat, 
  onOpenBrain,
  onOpenTopics
}: TeacherChatProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [selectedChatSourceId, setSelectedChatSourceId] = useState<string | null>(null);
  const [selectedChatTopicId, setSelectedChatTopicId] = useState<string | null>(null);
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const history = currentTopic ? currentTopic.chatHistory : teacher.chatHistory;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    onAddMessage(teacher.id, { role: 'user', text: userMessage });
    
    setIsLoading(true);
    try {
      const responseText = await chatWithTeacher(
        teacher, 
        userMessage, 
        history, 
        selectedChatSourceId ? [selectedChatSourceId] : undefined,
        currentTopic || (selectedChatTopicId ? teacher.topics?.find(t => t.id === selectedChatTopicId) : undefined)
      );
      onAddMessage(teacher.id, { role: 'model', text: responseText });
    } catch (error) {
      console.error(error);
      onAddMessage(teacher.id, { role: 'model', text: 'Desculpe, ocorreu um erro ao processar sua mensagem.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummary = async () => {
    if (teacher.files.length === 0) {
      alert('Nenhuma fonte adicionada para este professor ainda. Adicione arquivos ou links para gerar um sumário.');
      return;
    }

    setIsSummarizing(true);
    try {
      const filesToSummarize = selectedChatSourceId 
        ? teacher.files.filter(f => f.id === selectedChatSourceId)
        : teacher.files;

      const summaryText = await generateSummary(teacher, filesToSummarize);
      
      const sourceName = selectedChatSourceId 
        ? teacher.files.find(f => f.id === selectedChatSourceId)?.name
        : 'todas as fontes';

      onAddMessage(teacher.id, {
        role: 'model',
        text: `**Sumário de ${sourceName}:**\n\n${summaryText}`,
      });
    } catch (error) {
      console.error(error);
      onAddMessage(teacher.id, { role: 'model', text: 'Ocorreu um erro ao gerar o sumário dos arquivos.' });
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
    <div className="flex flex-col h-full bg-bg-main">
      {/* Header Hover Area */}
      <div className="relative group/header">
        <motion.header 
          initial={false}
          animate={{ 
            opacity: 1, 
            y: 0 
          }}
          className="bg-bg-sidebar border-b border-border-subtle px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between sticky top-0 z-20 bg-bg-sidebar/95 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3 lg:gap-6 min-w-0">
            <button
              onClick={onBack}
              className="p-2 lg:p-3 -ml-1 lg:-ml-2 text-text-muted hover:text-text-primary hover:bg-border-subtle rounded-xl lg:rounded-2xl transition-all shrink-0"
            >
              <ArrowLeft className="w-[18px] h-[18px] lg:w-[20px] lg:h-[20px]" />
            </button>
            <div className="flex items-center gap-2 lg:gap-4 min-w-0">
              {currentTopic ? (
                <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-lg lg:rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shrink-0">
                  <Bookmark className="w-[18px] h-[18px] lg:w-[24px] lg:h-[24px]" />
                </div>
              ) : (
                teacher.imageUrl ? (
                  <img
                    src={teacher.imageUrl}
                    alt={teacher.name}
                    className="w-8 h-8 lg:w-12 lg:h-12 rounded-lg lg:rounded-2xl object-cover border border-border-strong grayscale shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-lg lg:rounded-2xl bg-bg-card border border-border-strong flex items-center justify-center shrink-0">
                    <Brain className="w-[18px] h-[18px] lg:w-[24px] lg:h-[24px] text-text-muted" />
                  </div>
                )
              )}
              <div className="min-w-0">
                <h2 className="font-bold text-text-primary leading-tight text-sm lg:text-base truncate">
                  {currentTopic ? currentTopic.name : teacher.name}
                </h2>
                <div className="relative">
                  <button
                    onClick={() => setIsTopicDropdownOpen(prev => !prev)}
                    className="flex items-center gap-1 text-[8px] lg:text-[10px] font-bold text-text-muted uppercase tracking-widest mt-0.5 hover:text-text-primary transition-colors truncate"
                    title="Selecionar Tópico"
                  >
                    <span className="truncate">
                      {selectedChatTopicId ? teacher.topics?.find(t => t.id === selectedChatTopicId)?.name : (currentTopic ? `Tópico de ${teacher.name}` : teacher.role)}
                    </span>
                    <ChevronDown   className={`w-[10px] h-[10px] lg:w-[12px] lg:h-[12px] ` + `transition-transform shrink-0 ${isTopicDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isTopicDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute left-0 top-full mt-2 w-56 bg-bg-card border border-border-strong rounded-2xl shadow-2xl z-20 overflow-hidden"
                      >
                        <div className="p-2">
                          <button
                            onClick={() => { setSelectedChatTopicId(null); setIsTopicDropdownOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${selectedChatTopicId === null ? 'bg-border-strong text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-border-subtle'}`}
                          >
                            <BookOpen size={14} /> Chat Geral
                          </button>
                          {teacher.topics?.map(topic => (
                            <button
                              key={topic.id}
                              onClick={() => { setSelectedChatTopicId(topic.id); setIsTopicDropdownOpen(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${selectedChatTopicId === topic.id ? 'bg-border-strong text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-border-subtle'}`}
                            >
                              <Bookmark size={14} /> {topic.name}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 lg:gap-3">
            {!currentTopic && (
              <button
                onClick={onOpenTopics}
                className="flex items-center gap-2 text-text-muted hover:text-text-primary hover:bg-border-subtle px-2 lg:px-4 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl text-[8px] lg:text-[10px] font-bold uppercase tracking-widest transition-all"
                title="Meus Tópicos"
              >
                <Bookmark className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" />
                <span className="hidden sm:inline">Tópicos</span>
              </button>
            )}
            <button
              onClick={handleClearChat}
              className="flex items-center gap-2 text-text-muted hover:text-red-400 hover:bg-red-400/5 px-2 lg:px-4 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl text-[8px] lg:text-[10px] font-bold uppercase tracking-widest transition-all"
              title="Limpar Chat"
            >
              <Trash2 className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
            <button
              onClick={handleSummary}
              disabled={isSummarizing || teacher.files.length === 0}
              className="flex items-center gap-2 bg-text-primary text-bg-main px-3 lg:px-6 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl text-[8px] lg:text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSummarizing ? <Loader2 className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px] animate-spin" /> : <BookOpen className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" />}
              <span className="hidden sm:inline">Sumário</span>
            </button>

            <button
              onClick={onOpenBrain}
              className="p-2 lg:p-3 bg-text-primary text-bg-main rounded-xl lg:rounded-2xl hover:scale-110 transition-all shadow-lg shrink-0"
              title="Cérebro do Professor"
            >
              <Brain className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" />
            </button>
          </div>
        </motion.header>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-4 lg:space-y-8">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-text-muted space-y-4 lg:space-y-6">
            <div className="w-20 h-20 lg:w-32 lg:h-32 rounded-[20px] lg:rounded-[32px] bg-bg-card border border-border-subtle flex items-center justify-center overflow-hidden">
              {currentTopic ? (
                <Bookmark className="w-[28px] h-[28px] lg:w-[48px] lg:h-[48px] opacity-20" />
              ) : (
                teacher.imageUrl ? (
                  <img src={teacher.imageUrl} alt="" className="w-full h-full object-cover opacity-20 grayscale" referrerPolicy="no-referrer" />
                ) : (
                  <Brain className="w-[28px] h-[28px] lg:w-[48px] lg:h-[48px] opacity-20" />
                )
              )}
            </div>
            <p className="text-center max-w-xs lg:max-w-sm text-[10px] lg:text-sm font-medium leading-relaxed px-6">
              {currentTopic 
                ? `Iniciando tópico: ${currentTopic.name}. O que você quer aprender sobre isso hoje?`
                : `Envie uma mensagem para começar a conversar com ${teacher.name}. Adicione fontes acima para que o professor as utilize como base de conhecimento.`
              }
            </p>
          </div>
        ) : (
          history.map((msg, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id || idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] lg:max-w-[75%] rounded-[18px] lg:rounded-[24px] px-4 lg:px-6 py-3 lg:py-5 leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-text-primary text-bg-main font-medium'
                    : 'bg-bg-card border border-border-subtle text-text-primary shadow-sm'
                }`}
              >
                {msg.role === 'model' ? (
                  <div className="prose prose-invert prose-xs lg:prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-bg-main prose-pre:border prose-pre:border-border-strong text-text-primary">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-xs lg:text-sm">{msg.text}</p>
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
            <div className="bg-bg-card border border-border-subtle rounded-[18px] lg:rounded-[24px] px-4 lg:px-6 py-3 lg:py-5 flex items-center gap-2 lg:gap-3 text-text-muted">
              <Loader2 className="w-[12px] h-[12px] lg:w-[16px] lg:h-[16px] animate-spin" />
              <span className="text-[8px] lg:text-[10px] font-bold uppercase tracking-widest">Digitando...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-bg-main p-4 lg:p-8 shrink-0 pb-safe lg:pb-8">
        <div className="max-w-4xl mx-auto relative flex flex-col gap-3 lg:gap-4 group/input">
          {/* Selective Source Selector */}
          {teacher.files.length > 0 && (
            <motion.div 
              initial={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 lg:gap-3 overflow-x-auto pb-2 scrollbar-none bg-bg-main/80 backdrop-blur-sm py-2 px-2 lg:px-4 rounded-xl lg:rounded-2xl border border-border-subtle/50"
            >
              <span className="text-[7px] lg:text-[9px] font-bold text-text-muted uppercase tracking-widest whitespace-nowrap">Falar sobre:</span>
              <button
                type="button"
                onClick={() => setSelectedChatSourceId(null)}
                className={`px-2.5 lg:px-4 py-1 lg:py-1.5 rounded-full text-[7px] lg:text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border ${
                  selectedChatSourceId === null
                    ? 'bg-text-primary text-bg-main border-text-primary'
                    : 'bg-bg-card text-text-muted border-border-subtle hover:border-border-strong'
                }`}
              >
                Tudo
              </button>
              {teacher.files.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => setSelectedChatSourceId(file.id)}
                  className={`px-2.5 lg:px-4 py-1 lg:py-1.5 rounded-full text-[7px] lg:text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border flex items-center gap-1 lg:gap-2 ${
                    selectedChatSourceId === file.id
                      ? 'bg-text-primary text-bg-main border-text-primary'
                      : 'bg-bg-card text-text-muted border-border-subtle hover:border-border-strong'
                  }`}
                >
                  {file.type === 'link' ? <LinkIcon className="w-[8px] h-[8px] lg:w-[10px] lg:h-[10px]" /> : <FileText className="w-[8px] h-[8px] lg:w-[10px] lg:h-[10px]" />}
                  <span className="truncate max-w-[60px] lg:max-w-none">{file.name}</span>
                </button>
              ))}
            </motion.div>
          )}

          <form onSubmit={handleSend} className="relative group/textarea">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={selectedChatSourceId 
                ? `Pergunte sobre "${teacher.files.find(f => f.id === selectedChatSourceId)?.name}"...` 
                : (selectedChatTopicId 
                  ? `Pergunte sobre "${teacher.topics?.find(t => t.id === selectedChatTopicId)?.name}"...` 
                  : "Pergunte algo...")
              }
              className="w-full bg-bg-card border border-border-subtle focus:bg-border-subtle focus:border-border-strong focus:ring-0 rounded-[18px] lg:rounded-[24px] py-3.5 lg:py-5 pl-4 lg:pl-6 pr-12 lg:pr-16 resize-none max-h-32 lg:max-h-48 min-h-[48px] lg:min-h-[64px] transition-all text-xs lg:text-sm placeholder:text-text-muted/50 text-text-primary"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-1.5 lg:right-3 bottom-1.5 lg:bottom-3 p-2 lg:p-3 text-bg-main bg-text-primary rounded-lg lg:rounded-2xl hover:opacity-90 disabled:opacity-20 transition-all active:scale-95"
            >
              <Send className="w-[16px] h-[16px] lg:w-[20px] lg:h-[20px]" />
            </button>
          </form>
        </div>
      </div>

      {/* Clear Chat Modal */}
      <AnimatePresence>
        {isClearModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-bg-card border border-border-strong rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col"
            >
              <div className="p-6 lg:p-8 border-b border-border-subtle">
                <h2 className="text-lg lg:text-xl font-bold text-text-primary">Limpar Chat</h2>
              </div>
              <div className="p-6 lg:p-8">
                <p className="text-xs lg:text-sm text-text-muted mb-6 lg:mb-8 leading-relaxed">
                  Tem certeza que deseja limpar todo o histórico de chat com <strong className="text-text-primary">{teacher.name}</strong>? Esta ação não pode ser desfeita.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsClearModalOpen(false)}
                    className="flex-1 px-4 lg:px-6 py-3 lg:py-4 rounded-xl lg:rounded-2xl font-bold text-[9px] lg:text-[10px] uppercase tracking-widest text-text-muted bg-border-subtle hover:bg-border-strong transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmClearChat}
                    className="flex-1 px-4 lg:px-6 py-3 lg:py-4 rounded-xl lg:rounded-2xl font-bold text-[9px] lg:text-[10px] uppercase tracking-widest text-white bg-red-500 hover:bg-red-600 transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
