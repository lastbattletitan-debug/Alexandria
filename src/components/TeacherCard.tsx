import { Teacher } from '../types';
import { motion } from 'motion/react';
import { Pencil, Trash2, Brain, BookOpen } from 'lucide-react';

interface TeacherCardProps {
  teacher: Teacher;
  viewMode: 'grid' | 'list' | 'categories' | 'status';
  onChat: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  onOpenBrain: (e: React.MouseEvent) => void;
  onOpenTopics: (e: React.MouseEvent) => void;
  zoom?: number;
}

export function TeacherCard({ 
  teacher, 
  viewMode, 
  onChat, 
  onEdit, 
  onDelete, 
  onOpenBrain,
  onOpenTopics,
  zoom = 1
}: TeacherCardProps) {
  const isList = viewMode === 'list';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <motion.div
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.98 }}
      onClick={onChat}
      className={`cursor-pointer group relative rounded-[12px] lg:rounded-[16px] overflow-hidden bg-bg-card flex transition-all duration-500 transform-gpu ${
        isList ? 'flex-row h-24 lg:h-32' : 'flex-col aspect-[2/3]'
      }`}
      style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
    >
      {/* Border Overlay */}
      <div className="absolute inset-0 rounded-[12px] lg:rounded-[16px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] group-hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] pointer-events-none z-50 transition-all duration-300" />

      {/* Grayscale Image with Overlay */}
      <div className={`${isList ? 'w-24 lg:w-32 h-full' : 'absolute inset-0 z-0'}`}>
        <img
          src={teacher.imageUrl}
          alt={teacher.name}
          className="w-full h-full object-cover grayscale brightness-[0.85] transition-all duration-700 group-hover:scale-110 group-hover:grayscale-0 group-hover:brightness-100"
          referrerPolicy="no-referrer"
        />
        {!isList && <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/40 to-transparent opacity-100 transition-colors duration-300" />}
      </div>
      
      {/* Action Buttons */}
      <div className={`absolute z-30 flex gap-1.5 lg:gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 ${
        isList ? 'right-4 lg:right-6 top-1/2 -translate-y-1/2 flex-row' : 'top-4 lg:top-6 right-4 lg:right-6 flex-col lg:translate-x-4 lg:group-hover:translate-x-0'
      }`}>
        <button
          onClick={(e) => { e.stopPropagation(); onOpenBrain(e); }}
          className="p-2 lg:p-3 bg-text-primary text-bg-card backdrop-blur-xl rounded-xl lg:rounded-2xl border border-border-strong transition-all hover:scale-110 shadow-xl"
          title="Cérebro do Professor"
        >
          <Brain size={14} className="lg:w-4 lg:h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onOpenTopics(e); }}
          className="p-2 lg:p-3 bg-bg-card/80 hover:bg-bg-card backdrop-blur-xl rounded-xl lg:rounded-2xl text-text-primary border border-border-strong transition-all shadow-xl"
          title="Tópicos de Estudo"
        >
          <BookOpen size={14} className="lg:w-4 lg:h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(e); }}
          className="p-2 lg:p-3 bg-bg-card/80 hover:bg-bg-card backdrop-blur-xl rounded-xl lg:rounded-2xl text-text-primary border border-border-strong transition-all shadow-xl"
          title="Editar Professor"
        >
          <Pencil size={14} className="lg:w-4 lg:h-4" />
        </button>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(e); }}
            className="p-2 lg:p-3 bg-red-500/10 hover:bg-red-500/20 backdrop-blur-xl rounded-xl lg:rounded-2xl text-red-500 border border-red-500/20 transition-all shadow-xl"
            title="Excluir Professor"
          >
            <Trash2 size={14} className="lg:w-4 lg:h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className={`relative z-20 flex flex-col items-start gap-0.5 lg:gap-1 ${
        isList ? 'flex-1 justify-center px-4 lg:px-8' : 'mt-auto p-3 lg:p-8'
      }`}>
        <span 
          className="font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-full border border-white/10 shadow-sm"
          style={{ fontSize: `${(isList ? 8 : 9) * zoom}px` }}
        >
          {teacher.category || 'Mente'}
        </span>
        
        <div className="mt-0">
          <h3 
            className="text-text-primary font-bold leading-tight tracking-tight drop-shadow-sm line-clamp-1"
            style={{ fontSize: `${(isList ? 16 : (isMobile ? 16 : 24)) * zoom}px` }}
          >
            {teacher.name}
          </h3>
          <p 
            className="text-text-muted font-bold uppercase tracking-[0.2em] mt-1 lg:mt-1.5"
            style={{ fontSize: `${(isList ? 8 : (isMobile ? 8 : 10)) * zoom}px` }}
          >
            {teacher.role}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
