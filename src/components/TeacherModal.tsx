import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { Teacher } from '../types';

interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (teacher: Omit<Teacher, 'id' | 'files' | 'chatHistory' | 'topics'>) => void;
  initialData?: Teacher | null;
  defaultRole?: 'Professor' | 'Mentor' | '';
}

export function TeacherModal({ isOpen, onClose, onSave, initialData, defaultRole }: TeacherModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState(''); // 'Professor' or 'Mentor'
  const [specialty, setSpecialty] = useState(''); // New state for specialty/subject
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('');
  const [personality, setPersonality] = useState('');
  const [personalitySources, setPersonalitySources] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setRole(initialData.role);
        setSpecialty(initialData.specialty || ''); // Initialize specialty
        setCategory(initialData.category || '');
        setDescription(initialData.description || '');
        setSystemInstruction(initialData.systemInstruction);
        setPersonality(initialData.personality || '');
        setPersonalitySources(initialData.personalitySources || '');
        setImageUrl(initialData.imageUrl);
      } else {
        setName('');
        setRole(defaultRole || '');
        setSpecialty(''); // Reset specialty
        setCategory('');
        setDescription('');
        setSystemInstruction('');
        setPersonality('');
        setPersonalitySources('');
        setImageUrl('');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim() || !specialty.trim()) return; // Ensure all required fields are filled

    let finalInstruction = systemInstruction;
    if (!finalInstruction) {
      finalInstruction = `Você é ${name}, um ${role} especialista em ${specialty}. Responda sempre de forma didática, encorajadora e clara, como um excelente ${role} faria.`;
      
      if (personality) {
        finalInstruction += ` Sua personalidade é: ${personality}.`;
      }
      
      if (personalitySources) {
        finalInstruction += ` Adapte seu estilo de fala e comportamento com base nas seguintes referências de textos ou vídeos: ${personalitySources}.`;
      }
    }
    
    onSave({
      name,
      role,
      specialty, // Pass the new specialty field
      category: category || 'Geral',
      description,
      imageUrl: imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=400`,
      systemInstruction: finalInstruction,
      personality,
      personalitySources,
    });
    
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
            className="bg-bg-card border border-border-strong rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-8 border-b border-border-subtle shrink-0">
              <h2 className="text-2xl font-bold text-text-primary">
                {initialData ? (role === 'Mentor' ? 'Editar Mentor' : 'Editar Professor') : (role === 'Mentor' ? 'Novo Mentor' : 'Novo Professor')}
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-text-muted hover:text-text-primary hover:bg-border-subtle rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-8">
              <form id="teacher-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
                
                {/* Image Upload */}
                <div className="flex flex-col items-center gap-2 mb-2">
                  <div 
                    className="w-24 h-24 rounded-3xl bg-border-subtle border-2 border-dashed border-border-strong flex items-center justify-center overflow-hidden relative group cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imageUrl ? (
                      <>
                        <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Upload className="text-white" size={24} />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-text-muted">
                        <ImageIcon size={24} />
                        <span className="text-[10px] uppercase font-bold mt-1 tracking-widest">Upload</span>
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

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">
                    {role === 'Mentor' ? 'Nome do Mentor' : 'Nome do Professor'}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={role === 'Mentor' ? 'Ex: Mentor Andrew' : 'Ex: Prof. Arnold'}
                    className="w-full bg-bg-main border border-border-subtle px-4 py-4 rounded-2xl text-text-primary focus:outline-none focus:border-border-strong transition-all placeholder:text-text-muted/50"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Tipo</label>
                  <select
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-bg-main border border-border-subtle px-4 py-4 rounded-2xl text-text-primary focus:outline-none focus:border-border-strong transition-all"
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="Professor">Professor</option>
                    <option value="Mentor">Mentor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Especialidade / Matéria</label>
                  <input
                    type="text"
                    required
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="Ex: Fitness, Matemática, História..."
                    className="w-full bg-bg-main border border-border-subtle px-4 py-4 rounded-2xl text-text-primary focus:outline-none focus:border-border-strong transition-all placeholder:text-text-muted/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Categoria</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ex: Exatas, Saúde, Humanas..."
                    className="w-full bg-bg-main border border-border-subtle px-4 py-4 rounded-2xl text-text-primary focus:outline-none focus:border-border-strong transition-all placeholder:text-text-muted/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Descrição Curta</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Uma breve descrição sobre o professor..."
                    rows={2}
                    className="w-full bg-bg-main border border-border-subtle px-4 py-4 rounded-2xl text-text-primary focus:outline-none focus:border-border-strong transition-all resize-none placeholder:text-text-muted/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Personalidade (Estilo, Humor, Jeito)</label>
                  <input
                    type="text"
                    value={personality}
                    onChange={(e) => setPersonality(e.target.value)}
                    placeholder="Ex: Engraçado, sarcástico, muito paciente..."
                    className="w-full bg-bg-main border border-border-subtle px-4 py-4 rounded-2xl text-text-primary focus:outline-none focus:border-border-strong transition-all placeholder:text-text-muted/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Referências de Personalidade (Links de Vídeos/Textos)</label>
                  <textarea
                    value={personalitySources}
                    onChange={(e) => setPersonalitySources(e.target.value)}
                    placeholder="Cole links de vídeos ou textos para o professor adaptar a personalidade..."
                    rows={2}
                    className="w-full bg-bg-main border border-border-subtle px-4 py-4 rounded-2xl text-text-primary focus:outline-none focus:border-border-strong transition-all resize-none placeholder:text-text-muted/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Instruções Customizadas (Opcional)</label>
                  <textarea
                    value={systemInstruction}
                    onChange={(e) => setSystemInstruction(e.target.value)}
                    placeholder="Substitui todas as instruções automáticas se preenchido..."
                    rows={3}
                    className="w-full bg-bg-main border border-border-subtle px-4 py-4 rounded-2xl text-text-primary focus:outline-none focus:border-border-strong transition-all resize-none placeholder:text-text-muted/50"
                  />
                </div>
              </form>
            </div>

            <div className="p-8 border-t border-border-subtle shrink-0">
              <button
                type="submit"
                form="teacher-form"
                className="w-full bg-text-primary text-bg-main font-bold text-[10px] uppercase tracking-widest py-4 px-4 rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                {initialData ? 'Salvar Alterações' : (role === 'Mentor' ? 'Adicionar Mentor' : 'Adicionar Professor')}
              </button>
            </div>
          </motion.div>
        </div>
      )} 
    </AnimatePresence>
  );
}
