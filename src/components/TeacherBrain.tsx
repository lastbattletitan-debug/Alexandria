import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Brain, 
  Upload, 
  Link as LinkIcon, 
  FileText, 
  X, 
  Save, 
  Trash2,
  Info,
  MessageSquare,
  Zap
} from 'lucide-react';
import { Teacher, TeacherFile } from '../types';

interface TeacherBrainProps {
  teacher: Teacher;
  onBack: () => void;
  onUpdateTeacher: (id: string, data: Partial<Teacher>) => void;
  onAddFile: (teacherId: string, file: Omit<TeacherFile, 'id'>) => void;
  onRemoveFile: (teacherId: string, fileId: string) => void;
}

export function TeacherBrain({ teacher, onBack, onUpdateTeacher, onAddFile, onRemoveFile }: TeacherBrainProps) {
  const [description, setDescription] = useState(teacher.description || '');
  const [personality, setPersonality] = useState(teacher.personality || '');
  const [personalitySources, setPersonalitySources] = useState(teacher.personalitySources || '');
  const [systemInstruction, setSystemInstruction] = useState(teacher.systemInstruction || '');
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveSettings = () => {
    onUpdateTeacher(teacher.id, {
      description,
      personality,
      personalitySources,
      systemInstruction
    });
    alert('Configurações do cérebro salvas com sucesso!');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`O arquivo ${file.name} é muito grande. O limite é 5MB.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const result = event.target?.result as string;
          const base64Data = result.split(',')[1];
          if (base64Data) {
            let mimeType = file.type;
            if (!mimeType && file.name.endsWith('.md')) mimeType = 'text/markdown';
            if (!mimeType && file.name.endsWith('.txt')) mimeType = 'text/plain';
            
            onAddFile(teacher.id, {
              name: file.name,
              mimeType: mimeType || 'application/octet-stream',
              data: base64Data,
              type: 'file'
            });
          }
        } catch (error) {
          console.error('Erro ao processar arquivo', error);
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
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

    setLinkUrl('');
    setLinkName('');
    setIsLinkModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-bg-main overflow-hidden">
      {/* Header */}
      <header className="bg-bg-sidebar border-b border-border-subtle px-8 py-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <button
            onClick={onBack}
            className="p-3 -ml-2 text-text-muted hover:text-text-primary hover:bg-border-subtle rounded-2xl transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-text-primary flex items-center justify-center">
              <Brain className="text-bg-main" size={24} />
            </div>
            <div>
              <h2 className="font-bold text-text-primary text-xl leading-tight">Cérebro de {teacher.name}</h2>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-0.5">Base de Conhecimento e Personalidade</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 bg-text-primary text-bg-main px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all active:scale-95"
        >
          <Save size={16} />
          Salvar Cérebro
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Left Column: Knowledge Base */}
          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                  <Zap size={14} className="text-yellow-500" /> Fontes de Conhecimento
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/png,image/jpeg,text/plain,application/pdf,text/markdown"
                    multiple
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-text-muted hover:text-text-primary bg-bg-card border border-border-subtle rounded-xl transition-all"
                    title="Upload de Arquivo"
                  >
                    <Upload size={18} />
                  </button>
                  <button
                    onClick={() => setIsLinkModalOpen(true)}
                    className="p-2 text-text-muted hover:text-text-primary bg-bg-card border border-border-subtle rounded-xl transition-all"
                    title="Adicionar Link"
                  >
                    <LinkIcon size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {teacher.files.length === 0 ? (
                  <div className="p-12 border-2 border-dashed border-border-strong rounded-[32px] flex flex-col items-center justify-center text-text-muted bg-bg-card/30">
                    <FileText size={48} className="mb-4 opacity-10" />
                    <p className="text-sm font-medium opacity-40">Nenhuma fonte adicionada</p>
                  </div>
                ) : (
                  teacher.files.map((file) => (
                    <div key={file.id} className="group flex items-center justify-between bg-bg-card border border-border-subtle p-4 rounded-2xl hover:border-border-strong transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${file.type === 'link' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
                          {file.type === 'link' ? <LinkIcon size={18} /> : <FileText size={18} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text-primary truncate max-w-[200px] sm:max-w-[300px]">{file.name}</p>
                          <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-0.5">{file.type === 'link' ? 'Link Externo' : file.mimeType}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveFile(teacher.id, file.id)}
                        className="p-2 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="bg-bg-card border border-border-subtle rounded-[32px] p-8">
              <div className="flex items-center gap-3 mb-4 text-text-primary">
                <Info size={18} className="text-blue-400" />
                <h4 className="font-bold text-sm">Como funciona o cérebro?</h4>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                As fontes de conhecimento são os documentos e links que o professor utiliza para responder às suas perguntas. 
                Quanto mais fontes você adicionar, mais inteligente e preciso o professor se tornará. 
                Você pode subir PDFs, imagens, textos e links da web.
              </p>
            </section>
          </div>

          {/* Right Column: Personality & Rules */}
          <div className="space-y-8">
            <section>
              <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Info size={14} className="text-blue-500" /> Informações Básicas
              </h3>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">Descrição do Professor</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Uma breve descrição sobre quem é este professor e o que ele ensina..."
                  rows={3}
                  className="w-full bg-bg-card border border-border-subtle px-6 py-5 rounded-[24px] text-text-primary focus:outline-none focus:border-border-strong transition-all resize-none text-sm placeholder:text-text-muted/30"
                />
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <MessageSquare size={14} className="text-emerald-500" /> Personalidade e Estilo
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">Definição de Personalidade</label>
                  <textarea
                    value={personality}
                    onChange={(e) => setPersonality(e.target.value)}
                    placeholder="Ex: Você é um professor sarcástico mas muito inteligente. Use gírias de tecnologia e seja direto..."
                    rows={4}
                    className="w-full bg-bg-card border border-border-subtle px-6 py-5 rounded-[24px] text-text-primary focus:outline-none focus:border-border-strong transition-all resize-none text-sm placeholder:text-text-muted/30"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">Referências de Estilo (Links/Vídeos)</label>
                  <textarea
                    value={personalitySources}
                    onChange={(e) => setPersonalitySources(e.target.value)}
                    placeholder="Cole links de vídeos do YouTube ou textos para o professor imitar o estilo..."
                    rows={3}
                    className="w-full bg-bg-card border border-border-subtle px-6 py-5 rounded-[24px] text-text-primary focus:outline-none focus:border-border-strong transition-all resize-none text-sm placeholder:text-text-muted/30"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">Instruções de Sistema (Regras de Ouro)</label>
                  <textarea
                    value={systemInstruction}
                    onChange={(e) => setSystemInstruction(e.target.value)}
                    placeholder="Regras específicas que o professor NUNCA deve quebrar..."
                    rows={5}
                    className="w-full bg-bg-card border border-border-subtle px-6 py-5 rounded-[24px] text-text-primary focus:outline-none focus:border-border-strong transition-all resize-none text-sm placeholder:text-text-muted/30 font-mono"
                  />
                  <p className="text-[9px] text-text-muted mt-3 italic">
                    * Estas instruções definem o comportamento base do modelo de IA.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Link Modal */}
      <AnimatePresence>
        {isLinkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-bg-card border border-border-strong rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-border-subtle">
                <h2 className="text-xl font-bold text-text-primary">Adicionar Link ao Cérebro</h2>
              </div>
              <form onSubmit={handleAddLink} className="p-8 flex flex-col gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">URL do Link</label>
                  <input
                    type="url"
                    required
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-bg-main border border-border-subtle px-4 py-4 rounded-2xl text-text-primary focus:outline-none focus:border-border-strong transition-all placeholder:text-text-muted/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Nome da Fonte</label>
                  <input
                    type="text"
                    value={linkName}
                    onChange={(e) => setLinkName(e.target.value)}
                    placeholder="Ex: Documentação Oficial"
                    className="w-full bg-bg-main border border-border-subtle px-4 py-4 rounded-2xl text-text-primary focus:outline-none focus:border-border-strong transition-all placeholder:text-text-muted/50"
                  />
                </div>
                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsLinkModalOpen(false)}
                    className="flex-1 px-6 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-text-muted bg-border-subtle hover:bg-border-strong transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!linkUrl}
                    className="flex-1 px-6 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-bg-main bg-text-primary hover:opacity-90 transition-colors disabled:opacity-20"
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
