import { useState, useMemo, useEffect } from 'react';
import { Plus, MoreVertical, Grid, List, LayoutGrid, Users, Library, Search, Bell, Settings, GraduationCap, Sun, Moon, Brain, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTeachers } from './hooks/useTeachers';
import { TeacherCard } from './components/TeacherCard';
import { TeacherModal } from './components/TeacherModal';
import { TeacherChat } from './components/TeacherChat';
import { TeacherBrain } from './components/TeacherBrain';
import { Teacher, Topic } from './types';
import { TeacherTopics } from './components/TeacherTopics';
import { ProfileModal } from './components/ProfileModal';

type ViewMode = 'grid' | 'list' | 'categories';
type Tab = 'professores' | 'mentores' | 'biblioteca';

export default function App() {
  const { 
    teachers, 
    addTeacher, 
    updateTeacher, 
    addMessageToTeacher, 
    addFileToTeacher, 
    removeFileFromTeacher, 
    clearTeacherChat, 
    deleteTeacher,
    addTopicToTeacher,
    updateTopicInTeacher,
    deleteTopicFromTeacher,
    addMessageToTopic
  } = useTeachers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [brainTeacherId, setBrainTeacherId] = useState<string | null>(null);
  const [topicsTeacherId, setTopicsTeacherId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('professores');
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [defaultRole, setDefaultRole] = useState<'Professor' | 'Mentor' | ''>('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [userName, setUserName] = useState('Seu nome');
  const [userImage, setUserImage] = useState('');
  const [userPlan, setUserPlan] = useState('Desconhecido');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'light') {
      root.classList.add('light-theme');
      root.style.colorScheme = 'light';
    } else {
      root.classList.remove('light-theme');
      root.style.colorScheme = 'dark';
    }
  }, [theme]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/user');
        if (res.ok) {
          const user = await res.json();
          setUserName(user.name);
          setUserImage(user.picture);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };

    fetchUser();
  }, []);

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [teachers, searchQuery]);

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);
  const topicsTeacher = teachers.find((t) => t.id === topicsTeacherId);
  const selectedTopic = topicsTeacher?.topics?.find(t => t.id === selectedTopicId);

  const handleAddOrEdit = (teacherData: Omit<Teacher, 'id' | 'files' | 'chatHistory' | 'topics'>) => {
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

  const openAddModal = (role: 'Professor' | 'Mentor') => {
    setEditingTeacher(null);
    setDefaultRole(role);
    setIsModalOpen(true);
  };

  const renderContent = () => {
    if (activeTab === 'mentores') {
      const mentors = filteredTeachers.filter(t => t.role === 'Mentor');

      if (mentors.length === 0) {
        return (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted border border-dashed border-border-strong rounded-[32px] p-12 mt-8 bg-border-subtle">
            <Users size={64} className="mb-4 opacity-20" />
            <h2 className="text-2xl font-bold text-text-primary mb-2">Área de Mentores</h2>
            <p className="text-center max-w-md opacity-60">
              Em breve você poderá adicionar mentores especializados aqui.
            </p>
          </div>
        );
      }

      if (viewMode === 'list') {
        return (
          <div className="flex flex-col gap-4 mt-8">
            {mentors.map((teacher) => (
              <div 
                key={teacher.id}
                onClick={() => setSelectedTeacherId(teacher.id)}
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'left center' }}
                className="group flex items-center justify-between p-6 bg-bg-card border border-border-subtle rounded-2xl hover:bg-border-strong transition-all cursor-pointer"
              >
                <div className="flex items-center gap-6">
                  <img 
                    src={teacher.imageUrl} 
                    alt={teacher.name} 
                    className="w-16 h-16 rounded-xl object-cover grayscale group-hover:grayscale-0 transition-all"
                  />
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">{teacher.name}</h3>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">{teacher.specialty}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-bold uppercase tracking-widest bg-border-subtle px-3 py-1.5 rounded-lg border border-border-subtle text-text-muted">
                    {teacher.category || 'Geral'}
                  </span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => { e.stopPropagation(); setBrainTeacherId(teacher.id); }}
                      className="p-3 bg-text-primary text-bg-main rounded-xl hover:scale-110 transition-all"
                      title="Cérebro do Mentor"
                    >
                      <Brain size={16} />
                    </button>
                    <button
                      onClick={(e) => openEditModal(e, teacher)}
                      className="p-3 bg-border-subtle hover:bg-border-strong rounded-xl text-text-muted hover:text-text-primary transition-all"
                    >
                      <Plus size={16} className="rotate-45" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      }

      if (viewMode === 'categories') {
        const categories = Array.from(new Set(mentors.map(t => t.category || 'Geral')));
        return (
          <div className="flex flex-col gap-12 mt-8">
            {categories.map(category => (
              <div key={category}>
                <h2 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] mb-6 flex items-center gap-4">
                  {category}
                  <div className="h-[1px] flex-1 bg-border-subtle" />
                </h2>
                <div 
                  className="grid gap-6"
                  style={{ 
                    gridTemplateColumns: `repeat(auto-fill, minmax(${280 * zoomLevel}px, 1fr))` 
                  }}
                >
                  {mentors.filter(t => (t.category || 'Geral') === category).map(teacher => (
                    <TeacherCard
                      key={teacher.id}
                      teacher={teacher}
                      onClick={() => setSelectedTeacherId(teacher.id)}
                      onEdit={(e) => openEditModal(e, teacher)}
                      onDelete={(e) => handleDeleteTeacher(e, teacher)}
                      onOpenBrain={(e) => { e.stopPropagation(); setBrainTeacherId(teacher.id); }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      }

      // Default Grid View for Mentors
      return (
        <div 
          className="grid gap-6 mt-8"
          style={{ 
            gridTemplateColumns: `repeat(auto-fill, minmax(${280 * zoomLevel}px, 1fr))` 
          }}
        >
          {mentors.map((teacher) => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              onClick={() => setSelectedTeacherId(teacher.id)}
              onEdit={(e) => openEditModal(e, teacher)}
              onDelete={(e) => handleDeleteTeacher(e, teacher)}
              onOpenBrain={(e) => { e.stopPropagation(); setBrainTeacherId(teacher.id); }}
            />
          ))}
          <button
            onClick={() => openAddModal('Mentor')}
            className="group relative rounded-[32px] border border-dashed border-border-strong bg-bg-card aspect-[3/4] flex flex-col items-center justify-center gap-4 hover:bg-border-strong transition-all active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-full bg-border-subtle flex items-center justify-center group-hover:bg-border-strong transition-colors">
              <Plus size={24} className="text-text-muted group-hover:text-text-primary transition-colors" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted group-hover:text-text-primary transition-colors">
              Novo Mentor
            </span>
          </button>
        </div>
      );
    }

    if (activeTab === 'biblioteca') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-text-muted border border-dashed border-border-strong rounded-[32px] p-12 mt-8 bg-border-subtle">
          <Library size={64} className="mb-4 opacity-20" />
          <h2 className="text-2xl font-bold text-text-primary mb-2">Sua Biblioteca</h2>
          <p className="text-center max-w-md opacity-60">
            Em breve você poderá gerenciar todos os seus arquivos e links em um só lugar.
          </p>
        </div>
      );
    }

    // Professores Tab
    if (activeTab === 'professores' && viewMode === 'list') {
      return (
        <div className="flex flex-col gap-4 mt-8">
          {filteredTeachers.filter(t => t.role === 'Professor').map((teacher) => (
            <div 
              key={teacher.id}
              onClick={() => setSelectedTeacherId(teacher.id)}
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'left center' }}
              className="group flex items-center justify-between p-6 bg-bg-card border border-border-subtle rounded-2xl hover:bg-border-strong transition-all cursor-pointer"
            >
              <div className="flex items-center gap-6">
                <img 
                  src={teacher.imageUrl} 
                  alt={teacher.name} 
                  className="w-16 h-16 rounded-xl object-cover grayscale group-hover:grayscale-0 transition-all"
                />
                <div>
                  <h3 className="text-lg font-bold text-text-primary">{teacher.name}</h3>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">{teacher.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-bold uppercase tracking-widest bg-border-subtle px-3 py-1.5 rounded-lg border border-border-subtle text-text-muted">
                  {teacher.category || 'Geral'}
                </span>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={(e) => { e.stopPropagation(); setBrainTeacherId(teacher.id); }}
                    className="p-3 bg-text-primary text-bg-main rounded-xl hover:scale-110 transition-all"
                    title="Cérebro do Professor"
                  >
                    <Brain size={16} />
                  </button>
                  <button
                    onClick={(e) => openEditModal(e, teacher)}
                    className="p-3 bg-border-subtle hover:bg-border-strong rounded-xl text-text-muted hover:text-text-primary transition-all"
                  >
                    <Plus size={16} className="rotate-45" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === 'professores' && viewMode === 'categories') {
      const categories = Array.from(new Set(filteredTeachers.filter(t => t.role === 'Professor').map(t => t.category || 'Geral')));
      return (
        <div className="flex flex-col gap-12 mt-8">
          {categories.map(category => (
            <div key={category}>
              <h2 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] mb-6 flex items-center gap-4">
                {category}
                <div className="h-[1px] flex-1 bg-border-subtle" />
              </h2>
              <div 
                className="grid gap-6"
                style={{ 
                  gridTemplateColumns: `repeat(auto-fill, minmax(${280 * zoomLevel}px, 1fr))` 
                }}
              >
                {filteredTeachers.filter(t => t.role === 'Professor' && (t.category || 'Geral') === category).map(teacher => (
                  <TeacherCard
                    key={teacher.id}
                    teacher={teacher}
                    onClick={() => setSelectedTeacherId(teacher.id)}
                    onEdit={(e) => openEditModal(e, teacher)}
                    onDelete={(e) => handleDeleteTeacher(e, teacher)}
                    onOpenBrain={(e) => { e.stopPropagation(); setBrainTeacherId(teacher.id); }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Default Grid View for Professores
    return (
      <div 
        className="grid gap-6 mt-8"
        style={{ 
          gridTemplateColumns: `repeat(auto-fill, minmax(${280 * zoomLevel}px, 1fr))` 
        }}
      >
        {filteredTeachers.filter(t => t.role === 'Professor').map((teacher) => (
          <TeacherCard
            key={teacher.id}
            teacher={teacher}
            onClick={() => setSelectedTeacherId(teacher.id)}
            onEdit={(e) => openEditModal(e, teacher)}
            onDelete={(e) => handleDeleteTeacher(e, teacher)}
            onOpenBrain={(e) => { e.stopPropagation(); setBrainTeacherId(teacher.id); }}
          />
        ))}
        
        {/* Add New Teacher Card */}
        <button
          onClick={() => openAddModal('Professor')}
          className="group relative rounded-[32px] border border-dashed border-border-strong bg-bg-card aspect-[3/4] flex flex-col items-center justify-center gap-4 hover:bg-border-strong transition-all active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-full bg-border-subtle flex items-center justify-center group-hover:bg-border-strong transition-colors">
            <Plus size={24} className="text-text-muted group-hover:text-text-primary transition-colors" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted group-hover:text-text-primary transition-colors">
            Novo Professor
          </span>
        </button>
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-bg-main font-sans text-text-primary flex relative overflow-hidden transition-colors duration-300`}>
      {/* Sidebar Trigger Area */}
      <div 
        className="fixed left-0 top-0 bottom-0 w-4 z-50 cursor-pointer"
        onMouseEnter={() => setIsSidebarHovered(true)}
      />

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarHovered ? 288 : 0,
          opacity: isSidebarHovered ? 1 : 0,
          x: isSidebarHovered ? 0 : -20
        }}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className="fixed left-0 top-0 bottom-0 bg-bg-sidebar border-r border-border-subtle flex flex-col p-8 z-40 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 mb-12 min-w-[224px]">
          <div className="w-10 h-10 bg-text-primary rounded-xl flex items-center justify-center transition-colors">
            <GraduationCap className="text-bg-main" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">Alexandria</h1>
        </div>

        <nav className="flex-1 flex flex-col gap-2 min-w-[224px]">
          <button 
            onClick={() => setActiveTab('professores')}
            className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${activeTab === 'professores' ? 'bg-border-strong text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-border-subtle'}`}
          >
            <LayoutGrid size={20} />
            <span className="font-medium text-sm">Professores</span>
          </button>
          <button 
            onClick={() => setActiveTab('mentores')}
            className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${activeTab === 'mentores' ? 'bg-border-strong text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-border-subtle'}`}
          >
            <Users size={20} />
            <span className="font-medium text-sm">Mentores</span>
          </button>
        </nav>

        <div className="mt-auto flex flex-col gap-6 min-w-[224px]">
          {/* Zoom Control */}
          <div className="px-6 py-4 bg-border-subtle rounded-2xl border border-border-subtle">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Zoom dos Cards</span>
              <span className="text-[9px] font-bold text-text-primary bg-border-strong px-2 py-0.5 rounded">{Math.round(zoomLevel * 100)}%</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="1.5" 
              step="0.1" 
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
              className="w-full h-1 bg-border-strong rounded-lg appearance-none cursor-pointer accent-text-primary"
            />
          </div>

          <button className="flex items-center gap-4 px-6 py-4 rounded-2xl text-text-muted hover:text-text-primary hover:bg-border-subtle transition-all">
            <Settings size={20} />
            <span className="font-medium text-sm">Configurações</span>
          </button>
        </div>
      </motion.aside>

      <main className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ${isSidebarHovered ? 'lg:pl-72' : 'pl-0'}`}>
        <AnimatePresence mode="wait">
          {brainTeacherId ? (
            <motion.div
              key="brain"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 h-full"
            >
              <TeacherBrain
                teacher={teachers.find(t => t.id === brainTeacherId)!}
                onBack={() => setBrainTeacherId(null)}
                onUpdateTeacher={updateTeacher}
                onAddFile={addFileToTeacher}
                onRemoveFile={removeFileFromTeacher}
              />
            </motion.div>
          ) : topicsTeacherId ? (
            <motion.div
              key="topics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 h-full"
            >
              <TeacherTopics
                teacher={topicsTeacher!}
                onBack={() => setTopicsTeacherId(null)}
                onSelectTopic={(topicId) => setSelectedTopicId(topicId)}
                onAddTopic={addTopicToTeacher}
                onUpdateTopic={updateTopicInTeacher}
                onDeleteTopic={deleteTopicFromTeacher}
              />
            </motion.div>
          ) : selectedTopicId && topicsTeacher ? (
            <motion.div
              key="topic-chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 h-full"
            >
              <TeacherChat
                teacher={topicsTeacher}
                currentTopic={selectedTopic}
                onBack={() => setSelectedTopicId(null)}
                onAddMessage={(tId, msg) => addMessageToTopic(tId, selectedTopicId, msg)}
                onAddFile={addFileToTeacher}
                onRemoveFile={removeFileFromTeacher}
                onClearChat={() => updateTopicInTeacher(topicsTeacher.id, selectedTopicId, { chatHistory: [] })}
                onOpenBrain={() => setBrainTeacherId(topicsTeacher.id)}
                onOpenTopics={() => {}}
              />
            </motion.div>
          ) : selectedTeacher ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 h-full"
            >
              <TeacherChat
                teacher={selectedTeacher}
                onBack={() => setSelectedTeacherId(null)}
                onAddMessage={addMessageToTeacher}
                onAddFile={addFileToTeacher}
                onRemoveFile={removeFileFromTeacher}
                onClearChat={() => clearTeacherChat(selectedTeacher.id)}
                onOpenBrain={() => setBrainTeacherId(selectedTeacher.id)}
                onOpenTopics={() => setTopicsTeacherId(selectedTeacher.id)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col p-8 sm:p-12 overflow-y-auto"
            >
              {/* Top Bar */}
              <header className="flex items-center justify-between gap-8 mb-12">
                <div className="flex-1 max-w-2xl relative group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-text-primary transition-colors" size={20} />
                  <input 
                    type="text" 
                    placeholder="Procure por professores, matérias ou aulas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-bg-card border border-border-subtle rounded-2xl py-4 pl-16 pr-6 text-sm focus:outline-none focus:border-border-strong focus:bg-border-subtle transition-all text-text-primary placeholder:text-text-muted"
                  />
                </div>

                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                    className="p-2 text-text-muted hover:text-text-primary transition-all duration-300 active:scale-90"
                    title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
                  >
                    {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
                  </button>

                  <button className="relative p-2 text-text-muted hover:text-text-primary transition-colors">
                    <Bell size={24} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-bg-main" />
                  </button>
                  
                  <div 
                    className="flex items-center gap-4 pl-6 border-l border-border-strong cursor-pointer"
                    onClick={() => setIsProfileModalOpen(true)}
                  >
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-text-primary">{userName}</p>
                      <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">{userPlan === 'Pro' ? 'Membro Pro' : 'Membro Standard'}</p>
                    </div>
                    {userImage ? (
                      <img 
                        src={userImage} 
                        alt="User" 
                        className="w-10 h-10 rounded-xl object-cover border border-border-strong"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl border border-border-strong bg-bg-card flex items-center justify-center text-text-muted">
                        <User size={20} />
                      </div>
                    )}
                  </div>
                </div>
              </header>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <div className="bg-bg-card rounded-full p-1.5 flex items-center border border-border-subtle">
                  {(['professores', 'mentores', 'biblioteca'] as Tab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`relative px-8 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
                        activeTab === tab 
                          ? 'bg-border-strong text-text-primary' 
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openAddModal(activeTab === 'mentores' ? 'Mentor' : 'Professor')}
                    className="flex items-center justify-center gap-3 bg-text-primary text-bg-main px-8 py-4 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] hover:opacity-90 transition-all active:scale-95 whitespace-nowrap"
                  >
                    <Plus size={16} />
                    {activeTab === 'mentores' ? 'Adicionar novo mentor' : 'Adicionar novo professor'}
                  </button>
                  
                  <div className="relative">
                    <button 
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="p-4 bg-bg-card border border-border-subtle text-text-muted rounded-full hover:bg-border-strong transition-colors"
                    >
                      <MoreVertical size={20} />
                    </button>
                    
                    <AnimatePresence>
                      {isMenuOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-30" 
                            onClick={() => setIsMenuOpen(false)} 
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute right-0 mt-3 w-56 bg-bg-card border border-border-strong rounded-2xl shadow-2xl z-40 overflow-hidden"
                          >
                            <div className="p-2">
                              <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest px-4 py-3">Visualização</p>
                              <button
                                onClick={() => { setViewMode('grid'); setIsMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-border-strong text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-border-subtle'}`}
                              >
                                <Grid size={14} /> Padrão (Grid)
                              </button>
                              <button
                                onClick={() => { setViewMode('list'); setIsMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-border-strong text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-border-subtle'}`}
                              >
                                <List size={14} /> Lista
                              </button>
                              <button
                                onClick={() => { setViewMode('categories'); setIsMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'categories' ? 'bg-border-strong text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-border-subtle'}`}
                              >
                                <LayoutGrid size={14} /> Por Categoria
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
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
          defaultRole={defaultRole}
        />

        <ProfileModal 
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          userName={userName}
          userImage={userImage}
          userPlan={userPlan}
          onUpdateProfile={(name, image) => {
            setUserName(name);
            setUserImage(image);
          }}
          onCheckPlan={async () => {
            const res = await fetch('/api/check-plan');
            const data = await res.json();
            setUserPlan(data.plan);
          }}
        />

        {/* Delete Teacher Modal */}
        <AnimatePresence>
          {teacherToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-bg-card border border-border-strong rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col"
              >
                <div className="p-8 border-b border-border-subtle">
                  <h2 className="text-xl font-bold text-text-primary">Excluir Professor</h2>
                </div>
                <div className="p-8">
                  <p className="text-text-muted mb-8 leading-relaxed">
                    Tem certeza que deseja excluir o professor <strong className="text-text-primary">{teacherToDelete.name}</strong>? Esta ação não pode ser desfeita.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setTeacherToDelete(null)}
                      className="flex-1 px-6 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-text-muted bg-border-subtle hover:bg-border-strong transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmDeleteTeacher}
                      className="flex-1 px-6 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-white bg-red-500 hover:bg-red-600 transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
