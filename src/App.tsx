import { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, MoreVertical, Grid, List, LayoutGrid, Users, Library as LibraryIcon, Search, Settings, GraduationCap, Sun, Moon, Brain, User, BookOpen, Loader2, X, Trash2, FileText, Tag, Download, Edit2, Check } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';
import { useTeachers } from './hooks/useTeachers';
import { useLibrary } from './hooks/useLibrary';
import { generatePdfThumbnail } from './utils/pdfUtils';

import { TeacherCard } from './components/TeacherCard';
import { BookCard } from './components/BookCard';
import { TeacherModal } from './components/TeacherModal';
import { TeacherChat } from './components/TeacherChat';
import { TeacherBrain } from './components/TeacherBrain';
import { Teacher, Topic, LibraryBook } from './types';
import { TeacherTopics } from './components/TeacherTopics';
import { ProfileModal } from './components/ProfileModal';
import { PdfViewer } from './components/PdfViewer';

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
  
  const [zoomLevels, setZoomLevels] = useState<{ [key in Tab]: number }>(() => {
    const saved = localStorage.getItem('alexandria-zoom-levels');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse zoom levels', e);
      }
    }
    return {
      professores: 1,
      mentores: 1,
      biblioteca: 1
    };
  });

  useEffect(() => {
    localStorage.setItem('alexandria-zoom-levels', JSON.stringify(zoomLevels));
  }, [zoomLevels]);

  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [defaultRole, setDefaultRole] = useState<'Professor' | 'Mentor' | ''>('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [userName, setUserName] = useState('Seu nome');
  const [userImage, setUserImage] = useState('');
  const [userPlan, setUserPlan] = useState('Desconhecido');

  // Library states
  const { 
    books, 
    globalCategories,
    addBook, 
    removeBook, 
    addSnippet, 
    updateSnippet, 
    deleteSnippet, 
    updateBookProgress, 
    addBookCategory,
    removeBookCategory,
    updateBookStatus,
    updateBookRating,
    createGlobalCategory,
    renameCategory,
    deleteCategory
  } = useLibrary();
  const [isUploading, setIsUploading] = useState(false);
  const [readingBookId, setReadingBookId] = useState<string | null>(null);
  const [viewingSnippetsBookId, setViewingSnippetsBookId] = useState<string | null>(null);
  const [editingSnippet, setEditingSnippet] = useState<{ index: number, text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readingBook = useMemo(() => books.find(b => b.id === readingBookId) || null, [books, readingBookId]);
  const viewingSnippetsBook = useMemo(() => books.find(b => b.id === viewingSnippetsBookId) || null, [books, viewingSnippetsBookId]);

  const currentZoom = zoomLevels[activeTab];
  const setZoom = (value: number) => {
    setZoomLevels(prev => ({ ...prev, [activeTab]: value }));
  };

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
    setIsModalOpen(false);
    setEditingTeacher(null);
  };

  const openAddModal = (role: 'Professor' | 'Mentor') => {
    setDefaultRole(role);
    setEditingTeacher(null);
    setIsModalOpen(true);
  };

  const confirmDeleteTeacher = () => {
    if (teacherToDelete) {
      deleteTeacher(teacherToDelete.id);
      setTeacherToDelete(null);
    }
  };

  const handleBookUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    setIsUploading(true);
    try {
      const thumbnail = await generatePdfThumbnail(file);
      const newBook = addBook({
        title: file.name.replace('.pdf', ''),
        author: 'Desconhecido',
        thumbnail,
        url: URL.createObjectURL(file),
        file: file,
      });
      setReadingBookId(newBook.id);
    } catch (error) {
      console.error('Erro ao carregar livro:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportTxt = (book: LibraryBook) => {
    if (!book.snippets || book.snippets.length === 0) return;
    const text = `Notas de: ${book.title}\n\n` + book.snippets.join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title}-notas.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = (book: LibraryBook) => {
    if (!book.snippets || book.snippets.length === 0) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Notas: ${book.title}`, 10, 10);
    doc.setFontSize(12);
    
    let y = 20;
    book.snippets.forEach((snippet, i) => {
      const splitText = doc.splitTextToSize(`${i + 1}. ${snippet}`, 180);
      if (y + splitText.length * 7 > 280) {
        doc.addPage();
        y = 10;
      }
      doc.text(splitText, 10, y);
      y += splitText.length * 7 + 5;
    });
    
    doc.save(`${book.title}-notas.pdf`);
  };

  const renderContent = () => {
    if (activeTab === 'biblioteca') {
      const gridStyle = {
        gridTemplateColumns: `repeat(auto-fill, minmax(${200 * currentZoom}px, 1fr))`
      };

      if (viewMode === 'categories') {
        const allCategories = Array.from(new Set(books.flatMap(b => b.categories || [])));
        const booksWithNoCategory = books.filter(b => !b.categories || b.categories.length === 0);
        
        return (
          <div className="space-y-12 pb-24">
            {allCategories.map(category => {
              const categoryBooks = books.filter(b => b.categories?.includes(category));
              return (
                <div key={category} className="space-y-6">
                  <h2 className="text-xl font-bold text-text-primary flex items-center gap-3">
                    <Tag size={24} className="text-text-muted" />
                    {category}
                    <span className="text-sm font-normal text-text-muted bg-bg-card px-2 py-1 rounded-lg border border-border-subtle">
                      {categoryBooks.length}
                    </span>
                  </h2>
                  <div 
                    className="grid gap-6 origin-top-left transition-all duration-300"
                    style={gridStyle}
                  >
                    {categoryBooks.map(book => (
                      <BookCard 
                        key={book.id} 
                        book={book} 
                        onRead={(b) => setReadingBookId(b.id)} 
                        onViewNotes={(b) => setViewingSnippetsBookId(b.id)} 
                        onDelete={removeBook} 
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            
            {booksWithNoCategory.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-text-primary flex items-center gap-3">
                  <Tag size={24} className="text-text-muted" />
                  Sem Categoria
                  <span className="text-sm font-normal text-text-muted bg-bg-card px-2 py-1 rounded-lg border border-border-subtle">
                    {booksWithNoCategory.length}
                  </span>
                </h2>
                <div 
                  className="grid gap-6 origin-top-left transition-all duration-300"
                  style={gridStyle}
                >
                  {booksWithNoCategory.map(book => (
                    <BookCard 
                      key={book.id} 
                      book={book} 
                      onRead={(b) => setReadingBookId(b.id)} 
                      onViewNotes={(b) => setViewingSnippetsBookId(b.id)} 
                      onDelete={removeBook} 
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div className="pt-8 border-t border-border-subtle">
                <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-6">Adicionar</h3>
                <motion.div 
                whileHover={{ y: -8 }}
                onClick={() => fileInputRef.current?.click()}
                className="bg-bg-card border border-dashed border-white/10 rounded-[32px] p-8 flex flex-col items-center justify-center gap-6 cursor-pointer hover:bg-white/[0.02] transition-all group aspect-[3/4] w-64"
                >
                <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    {isUploading ? <Loader2 className="animate-spin text-text-primary" size={24} /> : <Plus className="text-text-primary" size={24} />}
                </div>
                <div className="text-center">
                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em]">Novo Livro</p>
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleBookUpload} 
                    accept=".pdf" 
                    className="hidden" 
                />
                </motion.div>
            </div>
          </div>
        );
      }

      return (
        <div 
          className="grid gap-6 origin-top-left transition-all duration-300"
          style={gridStyle}
        >
          {books.map(book => (
            <BookCard 
              key={book.id} 
              book={book} 
              onRead={(b) => setReadingBookId(b.id)} 
              onViewNotes={(b) => setViewingSnippetsBookId(b.id)} 
              onDelete={removeBook} 
            />
          ))}

          <motion.div 
            whileHover={{ y: -8 }}
            onClick={() => fileInputRef.current?.click()}
            className="bg-bg-card border border-dashed border-white/10 rounded-[32px] p-8 flex flex-col items-center justify-center gap-6 cursor-pointer hover:bg-white/[0.02] transition-all group aspect-[3/4]"
          >
            <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              {isUploading ? <Loader2 className="animate-spin text-text-primary" size={24} /> : <Plus className="text-text-primary" size={24} />}
            </div>
            <div className="text-center">
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em]">Novo Livro</p>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleBookUpload} 
              accept=".pdf" 
              className="hidden" 
            />
          </motion.div>
        </div>
      );
    }

    const displayTeachers = filteredTeachers.filter(t => t.role === (activeTab === 'mentores' ? 'Mentor' : 'Professor'));

    return (
      <div 
        className={`grid gap-6 origin-top-left transition-transform duration-300 ${viewMode === 'grid' ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}
        style={{ 
          transform: `scale(${currentZoom})`,
          width: `${100 / currentZoom}%`
        }}
      >
        {displayTeachers.map((teacher) => (
          <TeacherCard
            key={teacher.id}
            teacher={teacher}
            viewMode={viewMode}
            onChat={() => setSelectedTeacherId(teacher.id)}
            onEdit={() => { setEditingTeacher(teacher); setIsModalOpen(true); }}
            onDelete={() => setTeacherToDelete(teacher)}
            onOpenBrain={() => setBrainTeacherId(teacher.id)}
            onOpenTopics={() => setTopicsTeacherId(teacher.id)}
          />
        ))}
        {viewMode === 'grid' && (
          <motion.div 
            whileHover={{ y: -8 }}
            onClick={() => openAddModal(activeTab === 'mentores' ? 'Mentor' : 'Professor')}
            className="bg-bg-card border border-dashed border-white/10 rounded-[48px] p-8 flex flex-col items-center justify-center gap-6 cursor-pointer hover:bg-white/[0.02] transition-all group aspect-[3/4]"
          >
            <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="text-text-primary" size={24} />
            </div>
            <div className="text-center">
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em]">
                {activeTab === 'mentores' ? 'Novo Mentor' : 'Novo Professor'}
              </p>
            </div>
          </motion.div>
        )}
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
          <button 
            onClick={() => setActiveTab('biblioteca')}
            className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${activeTab === 'biblioteca' ? 'bg-border-strong text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-border-subtle'}`}
          >
            <LibraryIcon size={20} />
            <span className="font-medium text-sm">Biblioteca</span>
          </button>
        </nav>

        <div className="mt-auto flex flex-col gap-6 min-w-[224px]">
          <div className="px-6 py-4 bg-border-subtle rounded-2xl border border-border-subtle">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Zoom dos Cards</span>
              <span className="text-[9px] font-bold text-text-primary bg-border-strong px-2 py-0.5 rounded">{Math.round(currentZoom * 100)}%</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="1.5" 
              step="0.1" 
              value={currentZoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-1 bg-border-strong rounded-lg appearance-none cursor-pointer accent-text-primary"
            />
          </div>

          <button className="flex items-center gap-4 px-6 py-4 rounded-2xl text-text-muted hover:text-text-primary hover:bg-border-subtle transition-all">
            <Settings size={20} />
            <span className="font-medium text-sm">Configurações</span>
          </button>
        </div>
      </motion.aside>

      <main className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-500 ${isSidebarHovered ? 'lg:pl-72' : 'pl-0'}`}>
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
              className="flex-1 flex flex-col p-12 overflow-y-auto"
            >
              <header className="flex items-center justify-between gap-8 mb-12 sticky top-0 bg-bg-main/80 backdrop-blur-md z-10 py-4">
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
                  >
                    {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
                  </button>
                  
                  <div 
                    className="flex items-center gap-4 pl-6 border-l border-border-strong cursor-pointer"
                    onClick={() => setIsProfileModalOpen(true)}
                  >
                    <div className="text-right">
                      <p className="text-sm font-bold text-text-primary">{userName}</p>
                      <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">{userPlan === 'Pro' ? 'Membro Pro' : 'Membro Standard'}</p>
                    </div>
                    {userImage ? (
                      <img src={userImage} alt="User" className="w-10 h-10 rounded-xl object-cover border border-border-strong" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl border border-border-strong bg-bg-card flex items-center justify-center text-text-muted">
                        <User size={20} />
                      </div>
                    )}
                  </div>
                </div>
              </header>

              <div className="flex flex-row items-center justify-between gap-6 mb-8">
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
                    onClick={() => {
                      if (activeTab === 'biblioteca') {
                        fileInputRef.current?.click();
                      } else {
                        openAddModal(activeTab === 'mentores' ? 'Mentor' : 'Professor');
                      }
                    }}
                    className="flex items-center justify-center gap-3 bg-text-primary text-bg-main px-8 py-4 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] hover:opacity-90 transition-all active:scale-95 whitespace-nowrap"
                  >
                    <Plus size={16} />
                    {activeTab === 'mentores' ? 'Adicionar novo mentor' : activeTab === 'biblioteca' ? 'Adicionar novo livro' : 'Adicionar novo professor'}
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
                          <div className="fixed inset-0 z-30" onClick={() => setIsMenuOpen(false)} />
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

              <div>{renderContent()}</div>
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

        <AnimatePresence>
          {viewingSnippetsBook && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-bg-card border border-border-strong rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-8 border-b border-border-subtle flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-text-primary">Notas</h2>
                        <p className="text-sm text-text-muted">{viewingSnippetsBook.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleExportTxt(viewingSnippetsBook)}
                      className="p-2 hover:bg-border-subtle rounded-xl text-text-muted hover:text-text-primary transition-colors"
                      title="Exportar TXT"
                    >
                      <span className="text-xs font-bold mr-1">TXT</span>
                      <Download size={16} />
                    </button>
                    <button 
                      onClick={() => handleExportPdf(viewingSnippetsBook)}
                      className="p-2 hover:bg-border-subtle rounded-xl text-text-muted hover:text-text-primary transition-colors"
                      title="Exportar PDF"
                    >
                      <span className="text-xs font-bold mr-1">PDF</span>
                      <Download size={16} />
                    </button>
                    <div className="w-px h-6 bg-border-subtle mx-2" />
                    <button 
                      onClick={() => setViewingSnippetsBookId(null)}
                      className="p-2 hover:bg-border-subtle rounded-xl text-text-muted hover:text-text-primary transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>
                <div className="p-8 overflow-y-auto space-y-4">
                  {!viewingSnippetsBook.snippets || viewingSnippetsBook.snippets.length === 0 ? (
                    <div className="text-center py-12 text-text-muted">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Nenhuma nota salva ainda.</p>
                        <p className="text-xs mt-2 opacity-60">Selecione textos no leitor de PDF para salvar aqui.</p>
                    </div>
                  ) : (
                    viewingSnippetsBook.snippets.map((snippet, idx) => (
                        <div key={idx} className="bg-bg-main border border-border-subtle p-6 rounded-2xl relative group">
                            {editingSnippet?.index === idx ? (
                              <div className="space-y-3">
                                <textarea
                                  value={editingSnippet.text}
                                  onChange={(e) => setEditingSnippet({ ...editingSnippet, text: e.target.value })}
                                  className="w-full bg-bg-card border border-border-strong rounded-xl p-3 text-sm text-text-primary focus:outline-none focus:border-text-primary min-h-[100px]"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setEditingSnippet(null)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-text-muted hover:bg-border-subtle"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => {
                                      updateSnippet(viewingSnippetsBook.id, idx, editingSnippet.text);
                                      setEditingSnippet(null);
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-text-primary text-bg-main hover:opacity-90"
                                  >
                                    Salvar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-text-primary text-sm leading-relaxed italic">"{snippet}"</p>
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 bg-bg-main pl-2">
                                    <button 
                                        onClick={() => setEditingSnippet({ index: idx, text: snippet })}
                                        className="p-2 bg-bg-card border border-border-subtle rounded-lg text-text-muted hover:text-text-primary hover:bg-border-subtle transition-colors"
                                        title="Editar"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (confirm('Tem certeza que deseja excluir esta nota?')) {
                                              deleteSnippet(viewingSnippetsBook.id, idx);
                                            }
                                        }}
                                        className="p-2 bg-bg-card border border-border-subtle rounded-lg text-red-400 hover:text-red-500 hover:bg-border-subtle transition-colors"
                                        title="Excluir"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(snippet);
                                            alert('Copiado para a área de transferência!');
                                        }}
                                        className="p-2 bg-bg-card border border-border-subtle rounded-lg text-text-muted hover:text-text-primary hover:bg-border-subtle transition-colors"
                                        title="Copiar"
                                    >
                                        <FileText size={14} />
                                    </button>
                                </div>
                              </>
                            )}
                        </div>
                    ))
                  )}
                </div>
                <div className="p-6 border-t border-border-subtle bg-bg-main/50">
                    <button
                        onClick={() => setViewingSnippetsBookId(null)}
                        className="w-full py-4 bg-bg-card border border-border-subtle rounded-2xl text-text-primary font-bold text-xs uppercase tracking-widest hover:bg-border-subtle transition-colors"
                    >
                        Fechar
                    </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {readingBook && (
            <div className="fixed inset-0 z-[60] bg-bg-main">
              <PdfViewer 
                url={readingBook.url} 
                title={readingBook.title}
                onClose={() => setReadingBookId(null)}
                onSaveSnippet={(text) => addSnippet(readingBook.id, text)}
                onPageChange={(page, total) => updateBookProgress(readingBook.id, page, total)}
                onOpenNotes={() => setViewingSnippetsBookId(readingBook.id)}
                onAddCategory={(category) => addBookCategory(readingBook.id, category)}
                onRemoveCategory={(category) => removeBookCategory(readingBook.id, category)}
                onCreateCategory={createGlobalCategory}
                onRenameCategory={renameCategory}
                onDeleteCategory={deleteCategory}
                categories={globalCategories}
                currentCategories={readingBook.categories}
                status={readingBook.status}
                onUpdateStatus={(status) => updateBookStatus(readingBook.id, status)}
                rating={readingBook.rating}
                onUpdateRating={(rating) => updateBookRating(readingBook.id, rating)}
              />
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
