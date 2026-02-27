import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Image as ImageIcon, LogIn } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userImage: string;
  userPlan: string;
  onUpdateProfile: (name: string, image: string) => void;
  onCheckPlan: () => Promise<void>;
}

export function ProfileModal({ 
  isOpen, 
  onClose, 
  userName,
  userImage,
  userPlan,
  onUpdateProfile,
  onCheckPlan
}: ProfileModalProps) {
  const [name, setName] = useState(userName);
  const [imageUrl, setImageUrl] = useState(userImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onUpdateProfile(name, imageUrl);
    onClose();
  };

  // const handleLogin = async () => {
  //   try {
  //     const res = await fetch('/api/auth/google');
  //     const data = await res.json();
  //     window.location.href = data.url;
  //   } catch (error) {
  //     console.error('Failed to login with Google:', error);
  //   }
  // };

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
              <h2 className="text-lg lg:text-xl xl:text-2xl font-bold text-text-primary">Meu Perfil</h2>
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
                  className="w-16 h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 rounded-full bg-border-subtle border-2 border-dashed border-border-strong flex items-center justify-center overflow-hidden relative group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imageUrl ? (
                    <>
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="w-[20px] h-[20px] lg:w-[24px] lg:h-[24px] text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-text-muted">
                      <ImageIcon className="w-[20px] h-[20px] lg:w-[24px] lg:h-[24px]" />
                      <span className="text-[8px] lg:text-[10px] uppercase font-bold mt-1 tracking-widest">Upload</span>
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" />
              </div>

              <div>
                <label className="block text-[8px] lg:text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-bg-main border border-border-subtle px-4 py-3 rounded-xl text-xs lg:text-sm text-text-primary focus:outline-none focus:border-border-strong transition-all" />
              </div>

              <button
                onClick={handleSave}
                className="w-full bg-text-primary text-bg-main font-bold text-[8px] lg:text-[10px] uppercase tracking-widest py-3 lg:py-4 px-4 rounded-xl hover:opacity-90 transition-all"
              >
                Salvar Alterações
              </button>

              <div className="border-t border-border-subtle pt-4 lg:pt-6 space-y-3 lg:space-y-4">
                <button 
                  disabled
                  className="w-full flex items-center justify-center gap-2 lg:gap-3 bg-red-600 text-white px-4 py-3 rounded-xl text-xs lg:text-sm font-medium transition-colors opacity-50 cursor-not-allowed">
                  <LogIn className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" />
                  <span>Login com Google</span>
                </button>
                <p className="text-[10px] lg:text-xs text-text-muted text-center">Login com Google temporariamente desativado.</p>
              </div>

              <div className="border-t border-border-subtle pt-4 lg:pt-6 space-y-3 lg:space-y-4">
                 <div className="text-center">
                    <p className="text-[8px] lg:text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Seu Plano Gemini</p>
                    <p className="font-mono text-base lg:text-lg text-text-primary bg-border-subtle px-4 py-2 rounded-lg inline-block">{userPlan}</p>
                </div>
                <button 
                  onClick={async () => await onCheckPlan()}
                  className="w-full bg-border-strong text-text-primary font-bold text-[8px] lg:text-[10px] uppercase tracking-widest py-3 lg:py-4 px-4 rounded-xl hover:opacity-90 transition-all">
                  Verificar Plano
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
