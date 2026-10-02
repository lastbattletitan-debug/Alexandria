import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Image as ImageIcon, BookOpen, CheckCircle2, XCircle, GraduationCap, Loader2 } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userImage: string;
  onUpdateProfile: (name: string, imageFile?: File | Blob) => Promise<void> | void;
  stats: {
    booksCompleted: number;
    booksDiscarded: number;
    booksReading: number;
    teachersCount: number;
    mentorsCount: number;
  };
}

export function ProfileModal({ 
  isOpen, 
  onClose, 
  userName,
  userImage,
  onUpdateProfile,
  stats
}: ProfileModalProps) {
  const [name, setName] = useState(userName);
  const [previewUrl, setPreviewUrl] = useState(userImage);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateProfile(name, selectedFile || undefined);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-bg-card border border-border-strong rounded-[24px] lg:rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[85vh] lg:max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-4 lg:p-6 xl:p-8 border-b border-border-subtle shrink-0">
              <h2 className="text-lg lg:text-xl xl:text-2xl font-bold text-text-primary">Meu Perfil Pessoal</h2>
              <button
                onClick={onClose}
                className="p-1.5 lg:p-2 text-text-muted hover:text-text-primary hover:bg-border-subtle rounded-full transition-colors"
              >
                <X className="w-[16px] h-[16px] lg:w-[20px] lg:h-[20px]" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-4 lg:p-6 xl:p-8 space-y-4 lg:space-y-6">
              <div className="flex flex-col items-center gap-2">
                <div 
                  className="w-16 h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 rounded-full bg-border-subtle border-2 border-dashed border-border-strong flex items-center justify-center overflow-hidden relative group cursor-pointer shadow-inner"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl ? (
                    <>
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="w-[20px] h-[20px] lg:w-[24px] lg:h-[24px] text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-text-muted">
                      <ImageIcon className="w-[20px] h-[20px] lg:w-[24px] lg:h-[24px]" />
                      <span className="text-[8px] lg:text-[10px] uppercase font-bold mt-1 tracking-widest">Foto</span>
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
                <span className="text-[10px] text-text-muted">Clique para alterar a foto (salva no Cloud Storage)</span>
              </div>

              <div>
                <label className="block text-[8px] lg:text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-bg-main border border-border-subtle px-4 py-3 rounded-xl text-xs lg:text-sm text-text-primary focus:outline-none focus:border-border-strong transition-all" 
                />
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-text-primary text-bg-main font-bold text-[8px] lg:text-[10px] uppercase tracking-widest py-3 lg:py-4 px-4 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando no Firebase...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </button>

              <div className="border-t border-border-subtle pt-4 lg:pt-6">
                <p className="text-[8px] lg:text-[10px] font-bold text-text-muted uppercase tracking-widest mb-4">Estatísticas da Biblioteca</p>
                <div className="grid grid-cols-2 gap-3 lg:gap-4">
                  <div className="bg-bg-main border border-border-subtle rounded-xl p-3 lg:p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-text-muted">
                      <BookOpen className="w-4 h-4" />
                      <span className="text-[10px] lg:text-xs font-bold uppercase tracking-wider">Lendo Agora</span>
                    </div>
                    <span className="text-xl lg:text-2xl font-bold text-text-primary">{stats.booksReading}</span>
                  </div>
                  <div className="bg-bg-main border border-border-subtle rounded-xl p-3 lg:p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-text-muted">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-[10px] lg:text-xs font-bold uppercase tracking-wider">Concluídos</span>
                    </div>
                    <span className="text-xl lg:text-2xl font-bold text-text-primary">{stats.booksCompleted}</span>
                  </div>
                  <div className="bg-bg-main border border-border-subtle rounded-xl p-3 lg:p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-text-muted">
                      <XCircle className="w-4 h-4" />
                      <span className="text-[10px] lg:text-xs font-bold uppercase tracking-wider">Descartados</span>
                    </div>
                    <span className="text-xl lg:text-2xl font-bold text-text-primary">{stats.booksDiscarded}</span>
                  </div>
                  <div className="bg-bg-main border border-border-subtle rounded-xl p-3 lg:p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-text-muted">
                      <GraduationCap className="w-4 h-4" />
                      <span className="text-[10px] lg:text-xs font-bold uppercase tracking-wider">Professores</span>
                    </div>
                    <span className="text-xl lg:text-2xl font-bold text-text-primary">{stats.teachersCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
