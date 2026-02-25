import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Plus, 
  Bookmark, 
  Trash2, 
  Edit3, 
  MessageSquare, 
  Calendar,
  X,
  CheckCircle2,
  Clock,
  List, 
  LayoutGrid 
} from 'lucide-react';
import { Teacher, Topic } from '../types';

interface TeacherTopicsProps {
  teacher: Teacher;
  onBack: () => void;
  onSelectTopic: (topicId: string) => void;
  onAddTopic: (teacherId: string, topic: { name: string; description?: string }) => void;
  onUpdateTopic: (teacherId: string, topicId: string, updates: Partial<Topic>) => void;
  onDeleteTopic: (teacherId: string, topicId: string) => void;
}

export function TeacherTopics({
  teacher,
  onBack,
  onSelectTopic,
  onAddTopic,
  onUpdateTopic,
  onDeleteTopic
}: TeacherTopicsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleOpenAdd = () => {
    setEditingTopic(null);
    setName('');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, topic: Topic) => {
    e.stopPropagation();
    setEditingTopic(topic);
    setName(topic.name);
    setDescription(topic.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingTopic) {
      onUpdateTopic(teacher.id, editingTopic.id, { name, description });
    } else {
      onAddTopic(teacher.id, { name, description });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, topicId: string) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir este tópico?')) {
      onDeleteTopic(teacher.id, topicId);
    }
  };

  const toggleStatus = (e: React.MouseEvent, topic: Topic) => {
    e.stopPropagation();
    onUpdateTopic(teacher.id, topic.id, { 
      status: topic.status === 'completed' ? 'in_progress' : 'completed' 
    });
  };

  const topics = teacher.topics || [];
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // New state for view mode

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
              <Bookmark className="text-bg-main" size={24} />
            </div>
            <div>
              <h2 className="font-bold text-text-primary text-xl leading-tight">Meus Tópicos</h2>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-0.5">Assuntos em Aprendizado</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-bg-card rounded-full p-1.5 flex items-center border border-border-subtle">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-border-strong text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
              title="Visualização em Grade"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-full transition-all ${viewMode === 'list' ? 'bg-border-strong text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
              title="Visualização em Lista"
            >
              <List size={16} />
            </button>
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-text-primary text-bg-main px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all active:scale-95"
          >
            <Plus size={16} />
            Novo Tópico
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
        <div className="max-w-5xl mx-auto">
          {(!teacher.topics || teacher.topics.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-24 text-text-muted">
              <div className="w-24 h-24 rounded-[32px] bg-bg-card border border-border-subtle flex items-center justify-center mb-6">
                <Bookmark size={40} className="opacity-10" />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Nenhum tópico ainda</h3>
              <p className="text-center max-w-sm opacity-60 text-sm">
                Crie tópicos específicos para organizar seu aprendizado com {teacher.name}.
              </p>
              <button
                onClick={handleOpenAdd}
                className="mt-8 px-8 py-4 bg-border-strong text-text-primary rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-text-primary hover:text-bg-main transition-all"
              >
                Começar agora
              </button>
            </div>
          ) : (
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2' : 'flex flex-col'} gap-6`}>
              {topics.map((topic) => (
                <motion.div
                  key={topic.id}
                  layoutId={topic.id}
                  onClick={() => onSelectTopic(topic.id)}
                  className={`group relative rounded-[32px] border transition-all cursor-pointer ${viewMode === 'grid' ? 'p-8 flex flex-col h-full' : 'p-4 flex flex-row items-center justify-between'} ${
                    topic.status === 'completed' 
                      ? 'bg-emerald-500/5 border-emerald-500/20' 
                      : 'bg-bg-card border-border-subtle hover:border-border-strong'
                  }`}
                >
                  <div className={`flex ${viewMode === 'list' ? 'items-center flex-1 gap-4' : 'items-start justify-between mb-4 w-full'}`}>
                    <div className={`p-3 rounded-2xl ${
                      topic.status === 'completed' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-border-subtle text-text-muted'
                    }`}>
                      {topic.status === 'completed' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                    </div>
                    {viewMode === 'list' && (
                      <div className="flex flex-col flex-1">
                        <h3 className="text-lg font-bold text-text-primary leading-tight">{topic.name}</h3>
                        <p className="text-xs text-text-muted line-clamp-1">{topic.description || 'Sem descrição.'}</p>
                      </div>
                    )}
                    {viewMode === 'grid' && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={(e) => toggleStatus(e, topic)}
                          className={`p-2 rounded-xl border transition-all ${
                            topic.status === 'completed' 
                              ? 'bg-bg-card text-text-muted border-border-subtle hover:text-text-primary' 
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                          title={topic.status === 'completed' ? 'Marcar como em andamento' : 'Marcar como concluído'}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <button
                          onClick={(e) => handleOpenEdit(e, topic)}
                          className="p-2 bg-bg-card text-text-muted border border-border-subtle rounded-xl hover:text-text-primary transition-all"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, topic.id)}
                          className="p-2 bg-bg-card text-text-muted border border-border-subtle rounded-xl hover:text-red-400 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {viewMode === 'grid' && (
                    <h3 className="text-xl font-bold text-text-primary mb-2 leading-tight">{topic.name}</h3>
                  )}
                  {viewMode === 'grid' && (
                    <p className="text-sm text-text-muted line-clamp-2 mb-6 flex-1">
                      {topic.description || 'Sem descrição.'}
                    </p>
                  )}

                  <div className={`flex items-center ${viewMode === 'list' ? 'gap-4' : 'justify-between pt-6 border-t border-border-subtle w-full'}`}>
                    {viewMode === 'list' && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={(e) => toggleStatus(e, topic)}
                          className={`p-2 rounded-xl border transition-all ${
                            topic.status === 'completed' 
                              ? 'bg-bg-card text-text-muted border-border-subtle hover:text-text-primary' 
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                          title={topic.status === 'completed' ? 'Marcar como em andamento' : 'Marcar como concluído'}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <button
                          onClick={(e) => handleOpenEdit(e, topic)}
                          className="p-2 bg-bg-card text-text-muted border border-border-subtle rounded-xl hover:text-text-primary transition-all"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, topic.id)}
                          className="p-2 bg-bg-card text-text-muted border border-border-subtle rounded-xl hover:text-red-400 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      <Calendar size={12} />
                      {new Date(topic.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-text-primary uppercase tracking-widest">
                      <MessageSquare size={12} />
                      {topic.chatHistory.length} mensagens
                    </div>
                  </div>
                </motion.div>
              ))} 
            </div>
          )} 
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-bg-card border border-border-strong rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-8 border-b border-border-subtle">
                <h2 className="text-xl font-bold text-text-primary">
                  {editingTopic ? 'Editar Tópico' : 'Novo Tópico'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-primary">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Nome do Tópico</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Introdução à Termodinâmica"
                    className="w-full bg-bg-main border border-border-subtle px-4 py-4 rounded-2xl text-text-primary focus:outline-none focus:border-border-strong transition-all placeholder:text-text-muted/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Descrição (Opcional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="O que você quer focar neste tópico?"
                    rows={3}
                    className="w-full bg-bg-main border border-border-subtle px-4 py-4 rounded-2xl text-text-primary focus:outline-none focus:border-border-strong transition-all resize-none placeholder:text-text-muted/50"
                  />
                </div>
                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-text-muted bg-border-subtle hover:bg-border-strong transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!name.trim()}
                    className="flex-1 px-6 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-bg-main bg-text-primary hover:opacity-90 transition-colors disabled:opacity-20"
                  >
                    Salvar Tópico
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
