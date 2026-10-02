import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Brain, 
  Upload, 
  FileText, 
  Trash2, 
  Plus, 
  Copy, 
  Check, 
  Code, 
  Eye, 
  Search, 
  Calendar,
  FileCode,
  Download,
  AlertCircle
} from 'lucide-react';
import { Teacher, TeacherFile } from '../types';

interface MentorBrainViewProps {
  mentor: Teacher;
  onBack: () => void;
  onAddFile: (teacherId: string, file: Omit<TeacherFile, 'id'>) => TeacherFile | void;
  onRemoveFile: (teacherId: string, fileId: string) => void;
}

export function MentorBrainView({
  mentor,
  onBack,
  onAddFile,
  onRemoveFile,
}: MentorBrainViewProps) {
  // Filter only markdown/text files for the brain
  const mdFiles = (mentor.files || []).filter(
    (f) => f.name.toLowerCase().endsWith('.md') || f.mimeType === 'text/markdown' || f.mimeType === 'text/plain' || f.type === 'file'
  );

  const [selectedFileId, setSelectedFileId] = useState<string>(
    mdFiles.length > 0 ? mdFiles[0].id : ''
  );
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');
  const [searchFilter, setSearchFilter] = useState('');
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep selected file in sync if list changes
  useEffect(() => {
    if (mdFiles.length > 0 && (!selectedFileId || !mdFiles.some((f) => f.id === selectedFileId))) {
      setSelectedFileId(mdFiles[0].id);
    }
  }, [mdFiles, selectedFileId]);

  const activeFile = mdFiles.find((f) => f.id === selectedFileId) || mdFiles[0];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.md') && !file.type.includes('markdown') && !file.type.includes('text')) {
        // Continue but accept anyway if user picked it
      }
      try {
        const textContent = await file.text();
        const newFile = onAddFile(mentor.id, {
          name: file.name,
          mimeType: 'text/markdown',
          data: textContent,
          type: 'file',
        });
        if (newFile && (newFile as any).id) {
          setSelectedFileId((newFile as any).id);
        }
      } catch (err) {
        console.error('Erro ao ler arquivo .md:', err);
      }
    }

    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const textContent = await file.text();
        const newFile = onAddFile(mentor.id, {
          name: file.name,
          mimeType: 'text/markdown',
          data: textContent,
          type: 'file',
        });
        if (newFile && (newFile as any).id) {
          setSelectedFileId((newFile as any).id);
        }
      } catch (err) {
        console.error('Erro ao processar arquivo solto:', err);
      }
    }
  };

  const handleCopyContent = () => {
    if (!activeFile?.data) return;
    navigator.clipboard.writeText(activeFile.data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!activeFile?.data) return;
    const blob = new Blob([activeFile.data], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name.endsWith('.md') ? activeFile.name : `${activeFile.name}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredFiles = mdFiles.filter((f) =>
    f.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div 
      className="flex flex-col h-full bg-bg-main select-text"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 lg:px-8 py-3.5 border-b border-border-subtle bg-bg-card/70 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-3 lg:gap-4">
          <button
            onClick={onBack}
            className="p-2 -ml-1 text-text-muted hover:text-text-primary hover:bg-border-subtle rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
            title="Voltar aos Mentores"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Mentores</span>
          </button>

          <div className="h-5 w-px bg-border-subtle" />

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-border-subtle border border-border-strong flex-shrink-0">
              <img
                src={mentor.imageUrl}
                alt={mentor.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm lg:text-base font-bold text-text-primary leading-none">
                  {mentor.name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Brain size={10} />
                  Cérebro .MD
                </span>
              </div>
              <p className="text-[10px] text-text-muted font-medium mt-0.5">
                {mdFiles.length} {mdFiles.length === 1 ? 'arquivo .md armazenado' : 'arquivos .md armazenados'}
              </p>
            </div>
          </div>
        </div>

        {/* Upload Button */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".md,text/markdown,text/plain"
            multiple
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-text-primary text-bg-main px-3.5 lg:px-4 py-2 rounded-xl text-xs font-bold tracking-wide hover:opacity-90 active:scale-95 transition-all shadow-md"
          >
            <Upload size={14} />
            <span>Subir Cérebro (.md)</span>
          </button>
        </div>
      </header>

      {/* Drag Over Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm border-2 border-dashed border-amber-400/80 flex flex-col items-center justify-center p-6 text-center pointer-events-none"
          >
            <Brain size={48} className="text-amber-400 animate-bounce mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Solte seus arquivos .md aqui</h3>
            <p className="text-xs text-white/70">Eles serão salvos diretamente no cérebro de {mentor.name}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Body: File Explorer Sidebar + Markdown Viewer */}
      {mdFiles.length === 0 ? (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400 shadow-inner">
            <Brain size={32} />
          </div>
          <h2 className="text-lg font-bold text-text-primary mb-1">
            Cérebro vazio
          </h2>
          <p className="text-xs text-text-muted leading-relaxed mb-6">
            Nenhum arquivo <b>.md</b> foi adicionado ao cérebro de <b>{mentor.name}</b> ainda. Faça upload dos arquivos de conhecimento, notas e instruções para este mentor.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-text-primary text-bg-main px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-lg"
          >
            <Upload size={16} />
            <span>Subir Cérebro (.md)</span>
          </button>
        </div>
      ) : (
        /* Split view */
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Sidebar: List of .md files */}
          <aside className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-border-subtle bg-bg-card/40 flex flex-col shrink-0">
            {/* Search Files */}
            <div className="p-3 border-b border-border-subtle">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Filtrar arquivos .md..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-bg-main border border-border-subtle rounded-xl pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-border-strong"
                />
              </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredFiles.map((file) => {
                const isSelected = file.id === activeFile?.id;
                const charCount = file.data ? file.data.length : 0;
                const approxWords = file.data ? file.data.split(/\s+/).filter(Boolean).length : 0;

                return (
                  <div
                    key={file.id}
                    onClick={() => setSelectedFileId(file.id)}
                    className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-text-primary text-bg-main font-semibold shadow-sm'
                        : 'text-text-muted hover:text-text-primary hover:bg-border-subtle'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <FileText size={16} className={`shrink-0 ${isSelected ? 'text-bg-main' : 'text-amber-400'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs truncate leading-snug">{file.name}</p>
                        <p className={`text-[10px] opacity-70 truncate font-normal ${isSelected ? 'text-bg-main' : 'text-text-muted'}`}>
                          {approxWords} palavras • {(charCount / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remover "${file.name}" do cérebro deste mentor?`)) {
                          onRemoveFile(mentor.id, file.id);
                        }
                      }}
                      className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-500 transition-all ${
                        isSelected ? 'text-bg-main/70 hover:text-red-600' : 'text-text-muted'
                      }`}
                      title="Excluir arquivo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}

              {filteredFiles.length === 0 && (
                <div className="p-4 text-center text-xs text-text-muted">
                  Nenhum arquivo encontrado.
                </div>
              )}
            </div>

            {/* Quick Upload Action */}
            <div className="p-3 border-t border-border-subtle bg-bg-card/20">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-border-strong text-xs font-bold text-text-muted hover:text-text-primary hover:border-text-primary transition-all"
              >
                <Plus size={14} />
                <span>Adicionar outro .md</span>
              </button>
            </div>
          </aside>

          {/* Right Reading View */}
          <main className="flex-1 flex flex-col h-full overflow-hidden bg-bg-main">
            {activeFile ? (
              <>
                {/* Active File Header */}
                <div className="flex items-center justify-between px-4 lg:px-8 py-2.5 border-b border-border-subtle bg-bg-card/30 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCode size={16} className="text-amber-400 shrink-0" />
                    <span className="text-xs lg:text-sm font-bold text-text-primary truncate">
                      {activeFile.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* View mode toggle */}
                    <div className="flex items-center bg-bg-main border border-border-subtle rounded-lg p-0.5 text-[11px]">
                      <button
                        onClick={() => setViewMode('rendered')}
                        className={`px-2 py-1 rounded flex items-center gap-1 font-semibold transition-colors ${
                          viewMode === 'rendered' ? 'bg-text-primary text-bg-main' : 'text-text-muted hover:text-text-primary'
                        }`}
                        title="Visualização Formatada"
                      >
                        <Eye size={12} />
                        <span className="hidden sm:inline">Formatado</span>
                      </button>
                      <button
                        onClick={() => setViewMode('raw')}
                        className={`px-2 py-1 rounded flex items-center gap-1 font-semibold transition-colors ${
                          viewMode === 'raw' ? 'bg-text-primary text-bg-main' : 'text-text-muted hover:text-text-primary'
                        }`}
                        title="Visualizar Markdown Puro"
                      >
                        <Code size={12} />
                        <span className="hidden sm:inline">Código</span>
                      </button>
                    </div>

                    {/* Copy button */}
                    <button
                      onClick={handleCopyContent}
                      className="p-1.5 rounded-lg border border-border-subtle text-text-muted hover:text-text-primary hover:border-border-strong transition-colors"
                      title="Copiar texto do arquivo"
                    >
                      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>

                    {/* Download button */}
                    <button
                      onClick={handleDownload}
                      className="p-1.5 rounded-lg border border-border-subtle text-text-muted hover:text-text-primary hover:border-border-strong transition-colors"
                      title="Baixar arquivo .md"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>

                {/* Content Reader */}
                <div className="flex-1 overflow-y-auto px-4 lg:px-12 py-6 lg:py-10 max-w-4xl mx-auto w-full">
                  {viewMode === 'rendered' ? (
                    <article className="prose prose-invert max-w-none text-text-primary text-sm lg:text-base leading-relaxed space-y-4">
                      <ReactMarkdown
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1 className="text-2xl lg:text-3xl font-extrabold text-text-primary mt-6 mb-3 pb-2 border-b border-border-subtle" {...props} />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2 className="text-xl lg:text-2xl font-bold text-text-primary mt-6 mb-3" {...props} />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3 className="text-lg lg:text-xl font-bold text-text-primary mt-4 mb-2" {...props} />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="text-sm lg:text-base text-text-primary/90 leading-relaxed mb-4" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc pl-6 space-y-1.5 text-text-primary/90 mb-4" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal pl-6 space-y-1.5 text-text-primary/90 mb-4" {...props} />
                          ),
                          blockquote: ({ node, ...props }) => (
                            <blockquote className="border-l-4 border-amber-400/80 pl-4 py-1 italic bg-amber-400/5 rounded-r-lg my-4 text-text-primary/80" {...props} />
                          ),
                          code: ({ node, className, children, ...props }) => {
                            const isInline = !String(children).includes('\n');
                            return isInline ? (
                              <code className="bg-bg-card border border-border-subtle px-1.5 py-0.5 rounded text-xs font-mono text-amber-300" {...props}>
                                {children}
                              </code>
                            ) : (
                              <pre className="bg-[#10131a] border border-border-subtle p-4 rounded-xl overflow-x-auto text-xs font-mono text-slate-200 my-4">
                                <code {...props}>{children}</code>
                              </pre>
                            );
                          },
                          table: ({ node, ...props }) => (
                            <div className="overflow-x-auto my-4 border border-border-subtle rounded-xl">
                              <table className="w-full text-left border-collapse text-xs" {...props} />
                            </div>
                          ),
                          th: ({ node, ...props }) => (
                            <th className="bg-bg-card border-b border-border-subtle p-2.5 font-bold text-text-primary" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="border-b border-border-subtle/50 p-2.5 text-text-primary/80" {...props} />
                          ),
                        }}
                      >
                        {activeFile.data || '*Arquivo vazio.*'}
                      </ReactMarkdown>
                    </article>
                  ) : (
                    <pre className="bg-bg-card border border-border-subtle p-4 lg:p-6 rounded-2xl overflow-x-auto text-xs font-mono text-text-primary leading-relaxed whitespace-pre-wrap select-text">
                      {activeFile.data || ''}
                    </pre>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6 text-text-muted text-xs">
                Selecione um arquivo .md ao lado para visualizar seu conteúdo.
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
