import { Teacher } from '../types';
import { motion } from 'motion/react';
import { Pencil, Trash2, Brain } from 'lucide-react';

interface TeacherCardProps {
  teacher: Teacher;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  onOpenBrain: (e: React.MouseEvent) => void;
}

export function TeacherCard({ teacher, onClick, onEdit, onDelete, onOpenBrain }: TeacherCardProps) {
  return (
    <motion.div
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer group relative rounded-[32px] overflow-hidden bg-bg-card aspect-[3/4] flex flex-col border border-border-subtle hover:border-border-strong transition-all duration-500"
    >
      {/* Grayscale Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={teacher.imageUrl}
          alt={teacher.name}
          className="w-full h-full object-cover grayscale brightness-[0.85] transition-all duration-700 group-hover:scale-110 group-hover:grayscale-0 group-hover:brightness-100"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/40 to-transparent opacity-100 transition-colors duration-300" />
      </div>
      
      {/* Action Buttons (Hidden by default, shown on hover) */}
      <div className="absolute top-6 right-6 z-30 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
        <button
          onClick={onOpenBrain}
          className="p-3 bg-text-primary text-bg-card backdrop-blur-xl rounded-2xl border border-border-strong transition-all hover:scale-110 shadow-xl"
          title="Cérebro do Professor"
        >
          <Brain size={16} />
        </button>
        <button
          onClick={onEdit}
          className="p-3 bg-bg-card/80 hover:bg-bg-card backdrop-blur-xl rounded-2xl text-text-primary border border-border-strong transition-all shadow-xl"
          title="Editar Professor"
        >
          <Pencil size={16} />
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-3 bg-red-500/10 hover:bg-red-500/20 backdrop-blur-xl rounded-2xl text-red-500 border border-red-500/20 transition-all shadow-xl"
            title="Excluir Professor"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="relative z-20 mt-auto p-8 flex flex-col items-start gap-3">
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
