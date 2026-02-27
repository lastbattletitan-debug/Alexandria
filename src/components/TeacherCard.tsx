import { Teacher } from '../types';
import { motion } from 'motion/react';
import { Pencil, Trash2, Brain, BookOpen } from 'lucide-react';

interface TeacherCardProps {
  teacher: Teacher;
  viewMode: 'grid' | 'list' | 'categories';
  onChat: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  onOpenBrain: (e: React.MouseEvent) => void;
  onOpenTopics: (e: React.MouseEvent) => void;
}

export function TeacherCard({ 
  teacher, 
  viewMode, 
  onChat, 
  onEdit, 
  onDelete, 
  onOpenBrain,
  onOpenTopics
}: TeacherCardProps) {
  const isList = viewMode === 'list';

  return (
    <motion.div
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.98 }}
      onClick={onChat}
      className={`cursor-pointer group relative rounded-[48px] overflow-hidden bg-bg-card flex transition-all duration-500 border border-white/5 hover:border-white/20 ${
        isList ? 'flex-row h-32' : 'flex-col aspect-[3/4]'
      }`}
    >
      {/* Grayscale Image with Overlay */}
      <div className={`${isList ? 'w-32 h-full' : 'absolute inset-0 z-0'}`}>
        <img
          src={teacher.imageUrl}
          alt={teacher.name}
          className="w-full h-full object-cover grayscale brightness-[0.85] transition-all duration-700 group-hover:scale-110 group-hover:grayscale-0 group-hover:brightness-100"
          referrerPolicy="no-referrer"
        />
        {!isList && <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/40 to-transparent opacity-100 transition-colors duration-300" />}
      </div>
      
      {/* Action Buttons */}
      <div className={`absolute z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 ${
        isList ? 'right-6 top-1/2 -translate-y-1/2 flex-row' : 'top-6 right-6 flex-col translate-x-4 group-hover:translate-x-0'
      }`}>
        <button
          onClick={(e) => { e.stopPropagation(); onOpenBrain(e); }}
          className="p-3 bg-text-primary text-bg-card backdrop-blur-xl rounded-2xl border border-border-strong transition-all hover:scale-110 shadow-xl"
          title="Cérebro do Professor"
        >
          <Brain size={16} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onOpenTopics(e); }}
          className="p-3 bg-bg-card/80 hover:bg-bg-card backdrop-blur-xl rounded-2xl text-text-primary border border-border-strong transition-all shadow-xl"
          title="Tópicos de Estudo"
        >
          <BookOpen size={16} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(e); }}
          className="p-3 bg-bg-card/80 hover:bg-bg-card backdrop-blur-xl rounded-2xl text-text-primary border border-border-strong transition-all shadow-xl"
          title="Editar Professor"
        >
          <Pencil size={16} />
        </button>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(e); }}
            className="p-3 bg-red-500/10 hover:bg-red-500/20 backdrop-blur-xl rounded-2xl text-red-500 border border-red-500/20 transition-all shadow-xl"
            title="Excluir Professor"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className={`relative z-20 flex flex-col items-start gap-3 ${
        isList ? 'flex-1 justify-center px-8' : 'mt-auto p-8'
      }`}>
        <span className="text-[9px] font-bold uppercase tracking-[0.25em] bg-bg-card/80 backdrop-blur-md text-text-primary px-3 py-1.5 rounded-lg border border-border-strong shadow-sm">
          {teacher.category || 'Mente'}
        </span>
        
        <div className="mt-1">
          <h3 className="text-text-primary text-2xl font-bold leading-tight tracking-tight drop-shadow-sm">
            {teacher.name}
          </h3>
          <p className="text-text-muted text-[10px] font-bold uppercase tracking-[0.2em] mt-1.5">
            {teacher.role}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
