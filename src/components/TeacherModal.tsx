import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  Loader2, 
  Brain, 
  FileText, 
  Trash2, 
  Plus 
} from 'lucide-react';
import { analyzePersonalityLinks } from '../services/aiService';
import { Teacher, TeacherFile } from '../types';

interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (teacher: Omit<Teacher, 'id' | 'files' | 'chatHistory' | 'topics'> & { files?: TeacherFile[] }) => void;
  initialData?: Teacher | null;
  defaultRole?: 'Professor' | 'Mentor' | '';
}

export function TeacherModal({ isOpen, onClose, onSave, initialData, defaultRole }: TeacherModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Professor' | 'Mentor' | ''>(''); // 'Professor' or 'Mentor'
  const [specialty, setSpecialty] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('');
  const [personality, setPersonality] = useState('');
  const [personalitySources, setPersonalitySources] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [brainFiles, setBrainFiles] = useState<TeacherFile[]>([]);
  const [isUploadingBrain, setIsUploadingBrain] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const brainFileInputRef = useRef<HTMLInputElement>(null);

  const isMentor = role === 'Mentor' || (!role && defaultRole === 'Mentor');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setRole((initialData.role as 'Professor' | 'Mentor') || 'Mentor');
        setSpecialty(initialData.specialty || '');
        setCategory(initialData.category || '');
        setDescription(initialData.description || '');
        setSystemInstruction(initialData.systemInstruction || '');
        setPersonality(initialData.personality || '');
        setPersonalitySources(initialData.personalitySources || '');
        setImageUrl(initialData.imageUrl || '');
        setBrainFiles(initialData.files || []);
      } else {
        setName('');
        setRole(defaultRole || 'Mentor');
        setSpecialty('');
        setCategory('');
        setDescription('');
        setSystemInstruction('');
        setPersonality('');
        setPersonalitySources('');
        setImageUrl('');
        setBrainFiles([]);
      }
    }
  }, [isOpen, initialData, defaultRole]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleBrainFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingBrain(true);
    try {
      const newFiles: TeacherFile[] = [];
      for (const file of files) {
        const text = await file.text();
        newFiles.push({
          id: crypto.randomUUID(),
          name: file.name,
          mimeType: 'text/markdown',
          data: text,
          type: 'file',
        });
      }
      setBrainFiles((prev) => [...prev, ...newFiles]);
    } catch (err) {
      console.error('Erro ao ler arquivos .md para o cérebro:', err);
      alert('Erro ao carregar arquivos .md. Verifique se os arquivos são texto válido.');
    } finally {
      setIsUploadingBrain(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveBrainFile = (id: string) => {
    setBrainFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleAnalyzePersonality = async () => {
    if (!personalitySources.trim()) {
      alert('Adicione pelo menos um link na caixa de Referências de Personalidade primeiro.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const profile = await analyzePersonalityLinks(personalitySources);
      setPersonality(profile);
      alert('Personalidade extraída com sucesso! Verifique o campo de Personalidade.');
    } catch (error: any) {
      alert(error.message || 'Erro ao analisar os links.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const chosenRole = role || defaultRole || 'Mentor';

    if (chosenRole === 'Mentor') {
      // Mentores: Simplified configuration with brain upload (.md files)
      onSave({
        name: name.trim(),
        role: 'Mentor',
        specialty: 'Mentor',
        category: 'Mentoria',
        description: 'Mentor pessoal com cérebro em arquivos .md',
        imageUrl: imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=1a1a1a&color=fbbf24&size=400`,
        systemInstruction: `Você é o mentor ${name.trim()}.`,
        personality: '',
        personalitySources: '',
        files: brainFiles,
      });
    } else {
      // Professores: Full pedagogical configuration
      let finalInstruction = systemInstruction;
      if (!finalInstruction) {
        finalInstruction = `Você é ${name}, um Professor especialista em ${specialty || 'sua área'}. Responda sempre de forma didática, encorajadora e clara.`;
        if (personality) {
          finalInstruction += ` Sua personalidade é: ${personality}.`;
        }
        if (personalitySources) {
          finalInstruction += ` Adapte seu estilo de fala com base em: ${personalitySources}.`;
        }
      }

      onSave({
        name: name.trim(),
        role: 'Professor',
        specialty: specialty.trim() || 'Geral',
        category: category.trim() || 'Geral',
        description: description.trim(),
        imageUrl: imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=random&size=400`,
        systemInstruction: finalInstruction,
        personality,
        personalitySources,
        files: brainFiles,
      });
    }

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-bg-card border border-border-strong rounded-[24px] lg:rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] lg:max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 lg:p-6 border-b border-border-subtle shrink-0">
              <div>
                <h2 className="text-lg lg:text-xl font-bold text-text-primary flex items-center gap-2">
                  {isMentor ? <Brain className="text-amber-400 w-5 h-5" /> : null}
                  {initialData
                    ? (isMentor ? 'Editar Mentor' : 'Editar Professor')
                    : (isMentor ? 'Novo Mentor' : 'Novo Professor')}
                </h2>
                {isMentor && (
                  <p className="text-xs text-text-muted mt-0.5">
                    Suba o cérebro com arquivos .md para este mentor
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 lg:p-2 text-text-muted hover:text-text-primary hover:bg-border-subtle rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="overflow-y-auto p-4 lg:p-6">
              <form id="teacher-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                
                {/* Image Upload */}
                <div className="flex flex-col items-center gap-2 mb-1">
                  <div 
                    className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-border-subtle border-2 border-dashed border-border-strong flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-amber-400/60 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imageUrl ? (
                      <>
                        <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Upload className="w-5 h-5 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-text-muted">
                        <ImageIcon className="w-6 h-6" />
                        <span className="text-[9px] uppercase font-bold mt-1 tracking-widest">Foto</span>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">
                    {isMentor ? 'Nome do Mentor' : 'Nome do Professor'}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isMentor ? 'Ex: Mentor Andrew, Sêneca...' : 'Ex: Prof. Arnold'}
                    className="w-full bg-bg-main border border-border-subtle px-4 py-3 rounded-xl text-sm text-text-primary focus:outline-none focus:border-border-strong transition-all placeholder:text-text-muted/50" 
                  />
                </div>

                {/* Role Switcher if not locked */}
                {!defaultRole && (
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">
                      Tipo
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full bg-bg-main border border-border-subtle px-4 py-3 rounded-xl text-sm text-text-primary focus:outline-none focus:border-border-strong transition-all"
                    >
                      <option value="Mentor">Mentor</option>
                      <option value="Professor">Professor</option>
                    </select>
                  </div>
                )}

                {/* MENTOR VIEW: ONLY "SUBIR CÉREBRO" (.MD UPLOAD) */}
                {isMentor ? (
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                        <Brain size={12} className="text-amber-400" />
                        Subir Cérebro (.md)
                      </label>
                      <span className="text-[10px] text-text-muted">
                        {brainFiles.length} {brainFiles.length === 1 ? 'arquivo' : 'arquivos'}
                      </span>
                    </div>

                    <input
                      type="file"
                      ref={brainFileInputRef}
                      onChange={handleBrainFilesUpload}
                      accept=".md,text/markdown,text/plain"
                      multiple
                      className="hidden"
                    />

                    {/* Upload Drop Area */}
                    <div
                      onClick={() => brainFileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-border-strong hover:border-amber-400/80 bg-bg-main hover:bg-amber-400/[0.02] rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        {isUploadingBrain ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                      </div>
                      <p className="text-xs font-bold text-text-primary">
                        Clique para selecionar ou solte arquivos .md aqui
                      </p>
                      <p className="text-[10px] text-text-muted mt-1">
                        Armazene o conhecimento, documentos e notas deste mentor
                      </p>
                    </div>

                    {/* List of uploaded files in the modal */}
                    {brainFiles.length > 0 && (
                      <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {brainFiles.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-2.5 bg-bg-main border border-border-subtle rounded-xl text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                              <FileText size={14} className="text-amber-400 shrink-0" />
                              <span className="truncate text-text-primary font-medium">{file.name}</span>
                              <span className="text-[10px] text-text-muted shrink-0">
                                {file.data ? `${(file.data.length / 1024).toFixed(1)} KB` : ''}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveBrainFile(file.id)}
                              className="text-text-muted hover:text-red-400 p-1 rounded-lg transition-colors"
                              title="Remover arquivo"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* PROFESSOR VIEW: Complete traditional fields */
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">
                        Especialidade / Matéria
                      </label>
                      <input
                        type="text"
                        required
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        placeholder="Ex: Fitness, Matemática, História..."
                        className="w-full bg-bg-main border border-border-subtle px-4 py-3 rounded-xl text-sm text-text-primary focus:outline-none focus:border-border-strong transition-all placeholder:text-text-muted/50" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">
                        Categoria
                      </label>
                      <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="Ex: Exatas, Saúde, Humanas..."
                        className="w-full bg-bg-main border border-border-subtle px-4 py-3 rounded-xl text-sm text-text-primary focus:outline-none focus:border-border-strong transition-all placeholder:text-text-muted/50" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">
                        Descrição Curta
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Uma breve descrição sobre o professor..."
                        rows={2}
                        className="w-full bg-bg-main border border-border-subtle px-4 py-3 rounded-xl text-sm text-text-primary focus:outline-none focus:border-border-strong transition-all resize-none placeholder:text-text-muted/50" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">
                        Personalidade (Estilo, Humor, Jeito)
                      </label>
                      <textarea
                        value={personality}
                        onChange={(e) => setPersonality(e.target.value)}
                        placeholder="Ex: Engraçado, sarcástico, muito paciente..."
                        rows={3}
                        className="w-full bg-bg-main border border-border-subtle px-4 py-3 rounded-xl text-sm text-text-primary focus:outline-none focus:border-border-strong transition-all resize-none placeholder:text-text-muted/50" 
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest">
                          Referências de Personalidade (Links)
                        </label>
                        <button
                          type="button"
                          onClick={handleAnalyzePersonality}
                          disabled={isAnalyzing || !personalitySources.trim()}
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400 disabled:opacity-50 transition-colors"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Analisando...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              Extrair com IA
                            </>
                          )}
                        </button>
                      </div>
                      <textarea
                        value={personalitySources}
                        onChange={(e) => setPersonalitySources(e.target.value)}
                        placeholder="Cole links do YouTube ou textos para extrair a personalidade..."
                        rows={2}
                        className="w-full bg-bg-main border border-border-subtle px-4 py-3 rounded-xl text-sm text-text-primary focus:outline-none focus:border-border-strong transition-all resize-none placeholder:text-text-muted/50" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">
                        Instruções Customizadas (Opcional)
                      </label>
                      <textarea
                        value={systemInstruction}
                        onChange={(e) => setSystemInstruction(e.target.value)}
                        placeholder="Substitui todas as instruções automáticas se preenchido..."
                        rows={2}
                        className="w-full bg-bg-main border border-border-subtle px-4 py-3 rounded-xl text-sm text-text-primary focus:outline-none focus:border-border-strong transition-all resize-none placeholder:text-text-muted/50" 
                      />
                    </div>
                  </>
                )}
              </form>
            </div>

            {/* Footer */}
            <div className="p-4 lg:p-6 border-t border-border-subtle shrink-0">
              <button
                type="submit"
                form="teacher-form"
                className="w-full bg-text-primary text-bg-main font-bold text-[10px] uppercase tracking-widest py-3.5 px-4 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                {initialData
                  ? 'Salvar Alterações'
                  : (isMentor ? 'Criar Mentor' : 'Adicionar Professor')}
              </button>
            </div>
          </motion.div>
        </div>
      )} 
    </AnimatePresence>
  );
}
