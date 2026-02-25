import { Teacher } from '../types';
import { motion } from 'motion/react';
import { Pencil, Trash2 } from 'lucide-react';

interface TeacherCardProps {
  teacher: Teacher;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export function TeacherCard({ teacher, onClick, onEdit, onDelete }: TeacherCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="cursor-pointer group relative rounded-2xl overflow-hidden shadow-md bg-stone-100 aspect-[3/4] flex flex-col"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
      <img
        src={teacher.imageUrl}
        alt={teacher.name}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        referrerPolicy="no-referrer"
      />
      
      {/* Action Buttons */}
      <div className="absolute top-3 right-3 z-30 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
        <button
          onClick={onEdit}
          className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-all"
          title="Editar Professor"
        >
          <Pencil size={16} />
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-2 bg-red-500/80 hover:bg-red-600 backdrop-blur-md rounded-full text-white transition-all"
            title="Excluir Professor"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="relative z-20 mt-auto p-4 flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-stone-900/60 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
            {teacher.category || 'Geral'}
          </span>
        </div>
        <h3 className="text-white font-serif text-xl font-bold leading-tight">
          {teacher.name}
        </h3>
        <p className="text-stone-300 text-sm font-medium uppercase tracking-wider">
          {teacher.role}
        </p>
      </div>
    </motion.div>
  );
}
