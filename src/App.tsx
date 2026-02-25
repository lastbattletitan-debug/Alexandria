import { useState, useMemo } from 'react';
import { Plus, Landmark, MoreVertical, Grid, List, LayoutGrid, Users, Library, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTeachers } from './hooks/useTeachers';
import { TeacherCard } from './components/TeacherCard';
import { TeacherModal } from './components/TeacherModal';
import { TeacherChat } from './components/TeacherChat';
import { Teacher } from './types';

type ViewMode = 'grid' | 'list' | 'categories';
type Tab = 'professores' | 'mentores' | 'biblioteca';

export default function App() {
  const { teachers, addTeacher, updateTeacher, addMessageToTeacher, addFileToTeacher, clearTeacherChat, deleteTeacher } = useTeachers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('professores');
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);

  const handleAddOrEdit = (teacherData: Omit<Teacher, 'id' | 'files' | 'chatHistory'>) => {
    if (editingTeacher) {
      updateTeacher(editingTeacher.id, teacherData);
    } else {
      addTeacher(teacherData);
    }
  };

  const openEditModal = (e: React.MouseEvent, teacher: Teacher) => {
    e.stopPropagation();
    setEditingTeacher(teacher);
    setIsModalOpen(true);
  };

  const handleDeleteTeacher = (e: React.MouseEvent, teacher: Teacher) => {
    e.stopPropagation();
    setTeacherToDelete(teacher);
  };

  const confirmDeleteTeacher = () => {
    if (teacherToDelete) {
      deleteTeacher(teacherToDelete.id);
      if (selectedTeacherId === teacherToDelete.id) {
        setSelectedTeacherId(null);
      }
      setTeacherToDelete(null);
    }
  };

  const openAddModal = () => {
    setEditingTeacher(null);
    setIsModalOpen(true);
  };

  const renderContent = () => {
    if (activeTab === 'mentores') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-stone-400 border-2 border-dashed border-stone-300 rounded-3xl p-12 mt-8">
          <Users size={64} className="mb-4 opacity-50" />
          <h2 className="text-2xl font-serif font-medium text-stone-600 mb-2">Área de Mentores</h2>
          <p className="text-center max-w-md">
            Em breve você poderá adicionar mentores especializados aqui.
          </p>
        </div>
      );
    }

    if (activeTab === 'biblioteca') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-stone-400 border-2 border-dashed border-stone-300 rounded-3xl p-12 mt-8">
          <Library size={64} className="mb-4 opacity-50" />
          <h2 className="text-2xl font-serif font-medium text-stone-600 mb-2">Sua Biblioteca</h2>
          <p className="text-center max-w-md">
            Em breve você poderá gerenciar todos os seus arquivos e links em um só lugar.
          </p>
        </div>
      );
    }

    // Professores Tab
    if (teachers.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-stone-400 border-2 border-dashed border-stone-300 rounded-3xl p-12 mt-8">
          <Landmark size={64} className="mb-4 opacity-50" />
          <h2 className="text-2xl font-serif font-medium text-stone-600 mb-2">Sua Alexandria está vazia</h2>
          <p className="text-center max-w-md">
            Adicione seu primeiro professor para começar a aprender. Eles podem te ajudar com qualquer assunto!
          </p>
        </div>
      );
    }

    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 mt-8">
          {teachers.map((teacher) => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              onClick={() => setSelectedTeacherId(teacher.id)}
              onEdit={(e) => openEditModal(e, teacher)}
              onDelete={(e) => handleDeleteTeacher(e, teacher)}
            />
          ))}
        </div>
      );
    }

    if (viewMode === 'list') {
      return (
        <div className="flex flex-col gap-4 mt-8">
          {teachers.map((teacher) => (
            <div
              key={teacher.id}
              onClick={() => setSelectedTeacherId(teacher.id)}
              className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-stone-100 cursor-pointer hover:shadow-md transition-all group"
            >
              <img src={teacher.imageUrl} alt={teacher.name} className="w-16 h-16 rounded-xl object-cover" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-serif text-lg font-bold text-stone-900">{teacher.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                    {teacher.category || 'Geral'}
                  </span>
                </div>
                <p className="text-sm font-medium text-stone-500 uppercase tracking-wider">{teacher.role}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={(e) => openEditModal(e, teacher)}
                  className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors"
                  title="Editar"
                >
                  <MoreVertical size={20} />
                </button>
                <button
                  onClick={(e) => handleDeleteTeacher(e, teacher)}
                  className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (viewMode === 'categories') {
      const categories = teachers.reduce((acc, teacher) => {
        const cat = teacher.category || 'Geral';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(teacher);
        return acc;
      }, {} as Record<string, Teacher[]>);

      return (
        <div className="flex flex-col gap-8 mt-8">
          {Object.entries(categories).map(([category, catTeachers]) => (
            <div key={category}>
              <h2 className="text-xl font-serif font-bold text-stone-800 mb-4 border-b border-stone-200 pb-2">
                {category}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {catTeachers.map((teacher) => (
                  <TeacherCard
                    key={teacher.id}
                    teacher={teacher}
                    onClick={() => setSelectedTeacherId(teacher.id)}
                    onEdit={(e) => openEditModal(e, teacher)}
                    onDelete={(e) => handleDeleteTeacher(e, teacher)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 font-sans text-stone-900 flex flex-col">
      <AnimatePresence mode="wait">
        {selectedTeacher ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 h-screen"
          >
            <TeacherChat
              teacher={selectedTeacher}
              onBack={() => setSelectedTeacherId(null)}
              onAddMessage={addMessageToTeacher}
              onAddFile={addFileToTeacher}
              onClearChat={() => clearTeacherChat(selectedTeacher.id)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-6 sm:p-12"
          >
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-stone-900 flex items-center gap-3">
                  <Landmark className="text-stone-400" size={32} />
                  ALEXANDRIA
                </h1>
                <p className="text-stone-500 mt-2 text-base">Seus professores virtuais especializados.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={openAddModal}
                  className="flex items-center justify-center gap-2 bg-stone-900 text-white px-6 py-3.5 rounded-full font-medium hover:bg-stone-800 transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
                >
                  <Plus size={20} />
                  Adicionar novo professor
                </button>
                
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-3.5 bg-white border border-stone-200 text-stone-700 rounded-full hover:bg-stone-50 transition-colors shadow-sm"
                  >
                    <MoreVertical size={20} />
                  </button>
                  
                  {isMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-stone-100 z-20 overflow-hidden py-2">
                        <button
                          onClick={() => { setViewMode('grid'); setIsMenuOpen(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50'}`}
                        >
                          <Grid size={16} /> Grid
                        </button>
                        <button
                          onClick={() => { setViewMode('list'); setIsMenuOpen(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50'}`}
                        >
                          <List size={16} /> Lista
                        </button>
                        <button
                          onClick={() => { setViewMode('categories'); setIsMenuOpen(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'categories' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50'}`}
                        >
                          <LayoutGrid size={16} /> Categorias
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex justify-center mb-4">
              <div className="bg-[#111111] rounded-full p-1.5 flex items-center shadow-lg border border-white/5">
                {(['professores', 'mentores', 'biblioteca'] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-8 py-2.5 rounded-full text-xs font-bold uppercase tracking-[0.15em] transition-all duration-300 ${
                      activeTab === tab 
                        ? 'text-[#f5a623] drop-shadow-[0_0_8px_rgba(245,166,35,0.4)]' 
                        : 'text-stone-500 hover:text-stone-300'
                    }`}
                  >
                    {activeTab === tab && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-x-4 bottom-1.5 h-[1px] bg-gradient-to-r from-transparent via-[#f5a623] to-transparent opacity-50"
                      />
                    )}
                    <span className="relative z-10">{tab}</span>
                  </button>
                ))}
              </div>
            </div>

            {renderContent()}
          </motion.div>
        )}
      </AnimatePresence>

      <TeacherModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddOrEdit}
        initialData={editingTeacher}
      />

      {/* Delete Teacher Modal */}
      <AnimatePresence>
        {teacherToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-stone-100">
                <h2 className="text-xl font-serif font-bold text-stone-900">Excluir Professor</h2>
              </div>
              <div className="p-6">
                <p className="text-stone-600 mb-6">
                  Tem certeza que deseja excluir o professor <strong>{teacherToDelete.name}</strong>? Esta ação não pode ser desfeita e todo o histórico de chat e fontes serão perdidos.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTeacherToDelete(null)}
                    className="flex-1 px-4 py-3 rounded-xl font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDeleteTeacher}
                    className="flex-1 px-4 py-3 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
