import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { Teacher } from '../types';

interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (teacher: Omit<Teacher, 'id' | 'files' | 'chatHistory'>) => void;
  initialData?: Teacher | null;
}

export function TeacherModal({ isOpen, onClose, onSave, initialData }: TeacherModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [category, setCategory] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setRole(initialData.role);
        setCategory(initialData.category || '');
        setSystemInstruction(initialData.systemInstruction);
        setImageUrl(initialData.imageUrl);
      } else {
        setName('');
        setRole('');
        setCategory('');
        setSystemInstruction('');
        setImageUrl('');
      }
    }
  }, [isOpen, initialData]);

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
    if (!name || !role) return;

    const defaultInstruction = `Você é ${name}, um professor especialista em ${role}. Responda sempre de forma didática, encorajadora e clara, como um excelente professor faria.`;
    
    onSave({
      name,
      role,
      category: category || 'Geral',
      imageUrl: imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=400`,
      systemInstruction: systemInstruction || defaultInstruction,
    });
    
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-6 border-b border-stone-100 shrink-0">
              <h2 className="text-2xl font-serif font-bold text-stone-900">
                {initialData ? 'Editar Professor' : 'Novo Professor'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6">
              <form id="teacher-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                
                {/* Image Upload */}
                <div className="flex flex-col items-center gap-2 mb-2">
                  <div 
                    className="w-24 h-24 rounded-full bg-stone-100 border-2 border-dashed border-stone-300 flex items-center justify-center overflow-hidden relative group cursor-pointer"
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
                      <div className="flex flex-col items-center text-stone-400">
                        <ImageIcon size={24} />
                        <span className="text-[10px] uppercase font-medium mt-1 tracking-wider">Upload</span>
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
                  <label className="block text-sm font-medium text-stone-700 mb-1">Nome do Professor</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Prof. Arnold"
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Especialidade / Matéria</label>
                  <input
                    type="text"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ex: Fitness, Matemática, História..."
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Categoria</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ex: Exatas, Saúde, Humanas..."
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Regras de Operação (Instruções)</label>
                  <textarea
                    value={systemInstruction}
                    onChange={(e) => setSystemInstruction(e.target.value)}
                    placeholder="Como o professor deve se comportar? (Deixe em branco para o padrão)"
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all resize-none"
                  />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-stone-100 shrink-0">
              <button
                type="submit"
                form="teacher-form"
                className="w-full bg-stone-900 text-white font-medium py-3 px-4 rounded-xl hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:ring-offset-2 transition-all flex items-center justify-center gap-2"
              >
                {initialData ? 'Salvar Alterações' : 'Adicionar Professor'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
