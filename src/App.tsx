import { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, MoreVertical, Grid, List, LayoutGrid, Users, Library as LibraryIcon, Search, Settings, GraduationCap, Sun, Moon, Brain, User, BookOpen, Loader2, X, Trash2, FileText, Tag, Download, Edit2, Check, Star, Rows, Move } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
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
import { SortableBookCard } from './components/SortableBookCard';

type ViewMode = 'grid' | 'list' | 'categories' | 'status';
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
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem('alexandria-view-mode') as ViewMode) || 'grid');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('professores');
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Library sorting and filtering
  const [librarySort, setLibrarySort] = useState<'recent' | 'rating' | 'progress' | 'manual'>(() => (localStorage.getItem('alexandria-library-sort') as any) || 'recent');
  const [libraryFilter, setLibraryFilter] = useState<LibraryBook['status'] | 'Todos'>(() => (localStorage.getItem('alexandria-library-filter') as any) || 'Todos');

  useEffect(() => {
    localStorage.setItem('alexandria-view-mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('alexandria-library-sort', librarySort);
  }, [librarySort]);

  useEffect(() => {
    localStorage.setItem('alexandria-library-filter', libraryFilter);
  }, [libraryFilter]);

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

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [defaultRole, setDefaultRole] = useState<'Professor' | 'Mentor' | ''>('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 1024);
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || 'Seu nome');
  const [userImage, setUserImage] = useState(() => localStorage.getItem('userImage') || '');
  const [userPlan, setUserPlan] = useState(() => localStorage.getItem('userPlan') || 'Desconhecido');
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    localStorage.setItem('userName', userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem('userImage', userImage);
  }, [userImage]);

  useEffect(() => {
    localStorage.setItem('userPlan', userPlan);
  }, [userPlan]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start dragging, prevents accidental drags on clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    deleteCategory,
    reorderBooks
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

  const processedBooks = useMemo(() => {
    let result = books.filter(b => 
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter by status
    if (libraryFilter !== 'Todos') {
      result = result.filter(b => b.status === libraryFilter);
    }

    // Sort
    if (librarySort === 'manual') {
      // Manual sort uses the order in the 'books' array
      return result;
    }

    result.sort((a, b) => {
      if (librarySort === 'recent') {
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      }
      if (librarySort === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (librarySort === 'progress') {
        const progressA = a.totalPages ? (a.currentPage || 1) / a.totalPages : 0;
        const progressB = b.totalPages ? (b.currentPage || 1) / b.totalPages : 0;
        return progressB - progressA;
      }
      return 0;
    });

    return result;
  }, [books, searchQuery, librarySort, libraryFilter]);

  const handleAddOrEdit = (teacherData: Omit<Teacher, 'id' | 'files' | 'chatHistory' | 'topics'>) => {
    if (editingTeacher) {
      updateTeacher(editingTeacher.id, teacherData);
    } else {
      addTeacher(teacherData);
    }
    setIsModalOpen(false);
    setEditingTeacher(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = books.findIndex((b) => b.id === active.id);
      const newIndex = books.findIndex((b) => b.id === over.id);

      const newBooks = arrayMove(books, oldIndex, newIndex);
      reorderBooks(newBooks);
      setLibrarySort('manual');
    }
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
    const gridStyle = {
      gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 140 * currentZoom : 240 * currentZoom}px, 1fr))`
    };

    if (activeTab === 'biblioteca') {
      if (viewMode === 'status') {
        const statuses: LibraryBook['status'][] = ['Lendo agora', 'Concluído', 'Pausado', 'Próximo', 'Descartado'];
        const booksWithNoStatus = processedBooks.filter(b => !b.status);
        
        return (
          <div className="space-y-12 pb-24">
            {statuses.map(status => {
              const statusBooks = processedBooks.filter(b => b.status === status);
              if (statusBooks.length === 0) return null;
              return (
                <div key={status} className="space-y-6">
                  <h2 className="text-xl font-bold text-text-primary flex items-center gap-3">
                    <Check size={24} className="text-text-muted" />
                    {status}
                    <span className="text-sm font-normal text-text-muted bg-bg-card px-2 py-1 rounded-lg border border-border-subtle">
                      {statusBooks.length}
                    </span>
                  </h2>
                  <div 
                    className="grid gap-3 lg:gap-6 origin-top-left transition-all duration-300"
                    style={gridStyle}
                  >
                    {statusBooks.map(book => (
                      <BookCard 
                        key={book.id} 
                        book={book} 
                        onRead={(b) => setReadingBookId(b.id)} 
                        onViewNotes={(b) => setViewingSnippetsBookId(b.id)} 
                        onDelete={removeBook} 
                        viewMode={viewMode}
                        zoom={currentZoom}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            
            {booksWithNoStatus.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-text-primary flex items-center gap-3">
                  <Check size={24} className="text-text-muted" />
                  Sem Status
                  <span className="text-sm font-normal text-text-muted bg-bg-card px-2 py-1 rounded-lg border border-border-subtle">
                    {booksWithNoStatus.length}
                  </span>
                </h2>
                <div 
                  className="grid gap-3 lg:gap-6 origin-top-left transition-all duration-300"
                  style={gridStyle}
                >
                  {booksWithNoStatus.map(book => (
                    <BookCard 
                      key={book.id} 
                      book={book} 
                      onRead={(b) => setReadingBookId(b.id)} 
                      onViewNotes={(b) => setViewingSnippetsBookId(b.id)} 
                      onDelete={removeBook} 
                      viewMode={viewMode}
                      zoom={currentZoom}
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div className="pt-8 border-t border-border-subtle">
                <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-6">Adicionar</h3>
                <div 
                  className="grid gap-3 lg:gap-6 origin-top-left transition-all duration-300"
                  style={gridStyle}
                >
                  <motion.div 
                    whileHover={{ y: -8 }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`bg-bg-card border border-dashed border-white/10 rounded-[20px] lg:rounded-[32px] flex items-center justify-center cursor-pointer hover:bg-white/[0.02] transition-all group ${isMobile ? 'col-span-2 flex-row p-4 gap-4' : 'flex-col p-8 aspect-[3/5] gap-6'}`}
                  >
                    <div className="w-10 h-10 lg:w-14 lg:h-14 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        {isUploading ? <Loader2 className="animate-spin text-text-primary w-[20px] h-[20px] lg:w-[24px] lg:h-[24px]" /> : <Plus className="text-text-primary w-[20px] h-[20px] lg:w-[24px] lg:h-[24px]" />}
                    </div>
                    <div className="text-center">
                        <p 
                          className="font-bold text-text-muted uppercase tracking-[0.1em] lg:tracking-[0.2em] text-[10px] lg:text-[11px]"
                          style={!isMobile ? { fontSize: `${11 * currentZoom}px` } : {}}
                        >
                          Novo Livro
                        </p>
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
          </div>
        );
      }

      return (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {viewMode === 'categories' ? (
            <div className="space-y-12 pb-24">
              {Array.from(new Set(processedBooks.flatMap(b => b.categories || []))).map(category => {
                const categoryBooks = processedBooks.filter(b => b.categories?.includes(category));
                return (
                  <div key={category} className="space-y-6">
                    <h2 className="text-xl font-bold text-text-primary flex items-center gap-3">
                      <Tag size={24} className="text-text-muted" />
                      {category}
                      <span className="text-sm font-normal text-text-muted bg-bg-card px-2 py-1 rounded-lg border border-border-subtle">
                        {categoryBooks.length}
                      </span>
                    </h2>
                    <SortableContext 
                      items={categoryBooks.map(b => b.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div 
                        className="grid gap-3 lg:gap-6 origin-top-left transition-all duration-300"
                        style={gridStyle}
                      >
                        {categoryBooks.map(book => (
                          <SortableBookCard 
                            key={book.id} 
                            book={book} 
                            onRead={(b) => setReadingBookId(b.id)} 
                            onViewNotes={(b) => setViewingSnippetsBookId(b.id)} 
                            onDelete={removeBook} 
                            viewMode={viewMode}
                            zoom={currentZoom}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                );
              })}
              
              {processedBooks.filter(b => !b.categories || b.categories.length === 0).length > 0 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-text-primary flex items-center gap-3">
                    <Tag size={24} className="text-text-muted" />
                    Sem Categoria
                    <span className="text-sm font-normal text-text-muted bg-bg-card px-2 py-1 rounded-lg border border-border-subtle">
                      {processedBooks.filter(b => !b.categories || b.categories.length === 0).length}
                    </span>
                  </h2>
                  <SortableContext 
                    items={processedBooks.filter(b => !b.categories || b.categories.length === 0).map(b => b.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div 
                      className="grid gap-3 lg:gap-6 origin-top-left transition-all duration-300"
                      style={gridStyle}
                    >
                      {processedBooks.filter(b => !b.categories || b.categories.length === 0).map(book => (
                        <SortableBookCard 
                          key={book.id} 
                          book={book} 
                          onRead={(b) => setReadingBookId(b.id)} 
                          onViewNotes={(b) => setViewingSnippetsBookId(b.id)} 
                          onDelete={removeBook} 
                          viewMode={viewMode}
                          zoom={currentZoom}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              )}
              
              <div className="pt-8 border-t border-border-subtle">
                  <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-6">Adicionar</h3>
                  <div 
                    className="grid gap-3 lg:gap-6 origin-top-left transition-all duration-300"
                    style={gridStyle}
                  >
                    <motion.div 
                      whileHover={{ y: -8 }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`bg-bg-card border border-dashed border-white/10 rounded-[20px] lg:rounded-[32px] flex items-center justify-center cursor-pointer hover:bg-white/[0.02] transition-all group ${isMobile ? 'col-span-2 flex-row p-4 gap-4' : 'flex-col p-8 aspect-[3/5] gap-6'}`}
                    >
                      <div className="w-10 h-10 lg:w-14 lg:h-14 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          {isUploading ? <Loader2 className="animate-spin text-text-primary w-[20px] h-[20px] lg:w-[24px] lg:h-[24px]" /> : <Plus className="text-text-primary w-[20px] h-[20px] lg:w-[24px] lg:h-[24px]" />}
                      </div>
                      <div className="text-center">
                          <p 
                            className="font-bold text-text-muted uppercase tracking-[0.1em] lg:tracking-[0.2em] text-[10px] lg:text-[11px]"
                            style={!isMobile ? { fontSize: `${11 * currentZoom}px` } : {}}
                          >
                            Novo Livro
                          </p>
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
            </div>
          ) : (
            <SortableContext 
              items={processedBooks.map(b => b.id)}
              strategy={viewMode === 'list' ? verticalListSortingStrategy : rectSortingStrategy}
            >
              <div 
                className={`grid gap-3 lg:gap-6 origin-top-left transition-all duration-300 ${viewMode === 'list' ? 'grid-cols-1' : ''}`}
                style={viewMode === 'list' ? {} : gridStyle}
              >
                {processedBooks.map(book => (
                  <SortableBookCard 
                    key={book.id} 
                    book={book} 
                    onRead={(b) => setReadingBookId(b.id)} 
                    onViewNotes={(b) => setViewingSnippetsBookId(b.id)} 
                    onDelete={removeBook} 
                    viewMode={viewMode}
                    zoom={currentZoom}
                  />
                ))}

                <motion.div 
                  whileHover={{ y: -8 }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`bg-bg-card border border-dashed border-white/10 rounded-[20px] lg:rounded-[32px] flex items-center justify-center cursor-pointer hover:bg-white/[0.02] transition-all group ${isMobile ? 'col-span-2 flex-row p-4 gap-4' : 'flex-col p-8 aspect-[3/5] gap-6'}`}
                >
                  <div className="w-10 h-10 lg:w-14 lg:h-14 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    {isUploading ? <Loader2 className="animate-spin text-text-primary w-[20px] h-[20px] lg:w-[24px] lg:h-[24px]" /> : <Plus className="text-text-primary w-[20px] h-[20px] lg:w-[24px] lg:h-[24px]" />}
                  </div>
                  <div className="text-center">
                    <p 
                      className="font-bold text-text-muted uppercase tracking-[0.1em] lg:tracking-[0.2em] text-[10px] lg:text-[11px]"
                      style={!isMobile ? { fontSize: `${11 * currentZoom}px` } : {}}
                    >
                      Novo Livro
                    </p>
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
            </SortableContext>
          )}
        </DndContext>
      );
    }

    const displayTeachers = filteredTeachers.filter(t => t.role === (activeTab === 'mentores' ? 'Mentor' : 'Professor'));

    return (
      <div 
        className={`grid gap-3 lg:gap-6 origin-top-left transition-transform duration-300 ${viewMode === 'list' ? 'grid-cols-1' : ''}`}
        style={viewMode === 'grid' ? gridStyle : {}}
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
            zoom={currentZoom}
          />
        ))}
        {viewMode === 'grid' && (
          <motion.div 
            whileHover={{ y: -8 }}
            onClick={() => openAddModal(activeTab === 'mentores' ? 'Mentor' : 'Professor')}
            className={`bg-bg-card border border-dashed border-white/10 rounded-[20px] lg:rounded-[32px] flex items-center justify-center cursor-pointer hover:bg-white/[0.02] transition-all group ${isMobile ? 'col-span-2 flex-row p-4 gap-4' : 'flex-col p-8 aspect-[3/5] gap-6'}`}
          >
            <div className="w-10 h-10 lg:w-14 lg:h-14 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="text-text-primary w-[20px] h-[20px] lg:w-[24px] lg:h-[24px]" />
            </div>
            <div className="text-center">
              <p 
                className="font-bold text-text-muted uppercase tracking-[0.1em] lg:tracking-[0.2em] text-[10px] lg:text-[11px]"
                style={!isMobile ? { fontSize: `${11 * currentZoom}px` } : {}}
              >
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
      <main className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-500 pl-0`}>
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
              className="flex-1 flex flex-col p-4 lg:p-12 overflow-y-auto pb-24 lg:pb-12"
            >
              <header className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 lg:gap-8 mb-8 lg:mb-12 sticky top-0 bg-bg-main/80 backdrop-blur-md z-10 py-4">
                <div className="flex-1 max-w-2xl relative group order-2 lg:order-1">
                  <Search className="absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-text-primary transition-colors w-[16px] h-[16px] lg:w-[20px] lg:h-[20px]" />
                  <input 
                    type="text" 
                    placeholder="Procure por professores, matérias ou aulas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-bg-card border border-border-subtle rounded-xl lg:rounded-2xl py-3 lg:py-4 pl-10 lg:pl-16 pr-4 lg:pr-6 text-xs lg:text-sm focus:outline-none focus:border-border-strong focus:bg-border-subtle transition-all text-text-primary placeholder:text-text-muted"
                  />
                </div>

                <div className="flex items-center justify-end gap-4 lg:gap-6 order-1 lg:order-2 w-full lg:w-auto">
                  <div className="flex items-center gap-2 lg:gap-4 ml-auto">
                    <button 
                      onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                      className="p-2 text-text-muted hover:text-text-primary transition-all duration-300 active:scale-90"
                    >
                      {theme === 'dark' ? <Sun className="w-[20px] h-[20px] lg:w-[24px] lg:h-[24px]" /> : <Moon className="w-[20px] h-[20px] lg:w-[24px] lg:h-[24px]" />}
                    </button>
                    
                    {/* Settings Dropdown */}
                    <div className="relative">
                      <button 
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className="p-2 text-text-muted hover:text-text-primary transition-all duration-300 active:scale-90"
                      >
                        <Settings className="w-[20px] h-[20px] lg:w-[24px] lg:h-[24px]" />
                      </button>
                      <AnimatePresence>
                        {isSettingsOpen && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setIsSettingsOpen(false)} />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                              className="absolute right-0 mt-3 w-64 bg-bg-card border border-border-strong rounded-2xl shadow-2xl z-40 overflow-hidden p-4"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Zoom dos Cards</span>
                                <span className="text-[9px] font-bold text-text-primary bg-border-strong px-2 py-0.5 rounded">{Math.round(currentZoom * 100)}%</span>
                              </div>
                              <input 
                                type="range" 
                                min="0.3" 
                                max="1.5" 
                                step="0.1" 
                                value={currentZoom}
                                onChange={(e) => setZoom(parseFloat(e.target.value))}
                                className="w-full h-1 bg-border-strong rounded-lg appearance-none cursor-pointer accent-text-primary"
                              />
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    <div 
                      className="flex items-center gap-3 lg:gap-4 pl-2 lg:pl-6 border-l border-border-strong cursor-pointer"
                      onClick={() => setIsProfileModalOpen(true)}
                    >
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-text-primary">{userName}</p>
                        <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">{userPlan === 'Pro' ? 'Membro Pro' : 'Membro Standard'}</p>
                      </div>
                      {userImage ? (
                        <img src={userImage} alt="User" className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl object-cover border border-border-strong" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl border border-border-strong bg-bg-card flex items-center justify-center text-text-muted">
                          <User className="w-[16px] h-[16px] lg:w-[20px] lg:h-[20px]" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </header>

              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 lg:gap-6 mb-8">
                <div className="bg-bg-card rounded-full p-1 flex lg:p-1.5 items-center border border-border-subtle overflow-x-auto no-scrollbar">
                  {(['professores', 'mentores', 'biblioteca'] as Tab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`relative px-4 lg:px-8 py-2 lg:py-2.5 rounded-full text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.15em] lg:tracking-[0.2em] transition-all duration-300 whitespace-nowrap ${
                        activeTab === tab 
                          ? 'bg-border-strong text-text-primary' 
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 lg:gap-3">
                  <button
                    onClick={() => {
                      if (activeTab === 'biblioteca') {
                        fileInputRef.current?.click();
                      } else {
                        openAddModal(activeTab === 'mentores' ? 'Mentor' : 'Professor');
                      }
                    }}
                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 lg:gap-3 bg-text-primary text-bg-main px-4 lg:px-8 py-3 lg:py-4 rounded-full text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.1em] lg:tracking-[0.15em] hover:opacity-90 transition-all active:scale-95 whitespace-nowrap"
                  >
                    <Plus size={14} />
                    <span className="truncate">
                      {activeTab === 'mentores' ? 'Novo mentor' : activeTab === 'biblioteca' ? 'Novo livro' : 'Novo professor'}
                    </span>
                  </button>
                  
                  <div className="relative">
                    <button 
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="p-3 lg:p-4 bg-bg-card border border-border-subtle text-text-muted rounded-full hover:bg-border-strong transition-colors"
                    >
                      <MoreVertical size={18} />
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

                              {activeTab === 'biblioteca' && (
                                <button
                                  onClick={() => { setViewMode('status'); setIsMenuOpen(false); }}
                                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'status' ? 'bg-border-strong text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-border-subtle'}`}
                                >
                                  <Check size={14} /> Por Status
                                </button>
                              )}

                              {activeTab === 'biblioteca' && (
                                <>
                                  <div className="h-px bg-border-subtle my-2 mx-2" />
                                  <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest px-4 py-3">Ordenar Por</p>
                                  <button
                                    onClick={() => { setLibrarySort('manual'); setIsMenuOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${librarySort === 'manual' ? 'bg-border-strong text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-border-subtle'}`}
                                  >
                                    <Move size={14} /> Manual
                                  </button>
                                  <button
                                    onClick={() => { setLibrarySort('recent'); setIsMenuOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${librarySort === 'recent' ? 'bg-border-strong text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-border-subtle'}`}
                                  >
                                    <Plus size={14} className="rotate-45" /> Recentes
                                  </button>
                                  <button
                                    onClick={() => { setLibrarySort('rating'); setIsMenuOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${librarySort === 'rating' ? 'bg-border-strong text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-border-subtle'}`}
                                  >
                                    <Star size={14} /> Avaliação
                                  </button>
                                  <button
                                    onClick={() => { setLibrarySort('progress'); setIsMenuOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${librarySort === 'progress' ? 'bg-border-strong text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-border-subtle'}`}
                                  >
                                    <Rows size={14} /> Progresso
                                  </button>

                                  <div className="h-px bg-border-subtle my-2 mx-2" />
                                  <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest px-4 py-3">Filtrar por Status</p>
                                  <button
                                    onClick={() => { setLibraryFilter('Todos'); setIsMenuOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${libraryFilter === 'Todos' ? 'bg-border-strong text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-border-subtle'}`}
                                  >
                                    <LayoutGrid size={14} /> Todos
                                  </button>
                                  {['Lendo agora', 'Concluído', 'Pausado', 'Próximo', 'Descartado'].map((status) => (
                                    <button
                                      key={status}
                                      onClick={() => { setLibraryFilter(status as any); setIsMenuOpen(false); }}
                                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${libraryFilter === status ? 'bg-border-strong text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-border-subtle'}`}
                                    >
                                      <Check size={14} className={libraryFilter === status ? 'opacity-100' : 'opacity-0'} /> {status}
                                    </button>
                                  ))}
                                </>
                              )}
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
          onUpdateProfile={(name, image) => {
            setUserName(name);
            setUserImage(image);
          }}
          stats={{
            booksCompleted: processedBooks.filter(b => b.status === 'Concluído').length,
            booksDiscarded: processedBooks.filter(b => b.status === 'Descartado').length,
            booksReading: processedBooks.filter(b => b.status === 'Lendo agora').length,
            teachersCount: teachers.filter(t => t.role === 'Professor').length,
            mentorsCount: teachers.filter(t => t.role === 'Mentor').length
          }}
        />

        <AnimatePresence>
          {teacherToDelete && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-bg-card border border-border-strong rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col"
              >
                <div className="p-6 lg:p-8 border-b border-border-subtle">
                  <h2 className="text-lg lg:text-xl font-bold text-text-primary">Excluir Professor</h2>
                </div>
                <div className="p-6 lg:p-8">
                  <p className="text-sm lg:text-base text-text-muted mb-8 leading-relaxed">
                    Tem certeza que deseja excluir o professor <strong className="text-text-primary">{teacherToDelete.name}</strong>? Esta ação não pode ser desfeita.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setTeacherToDelete(null)}
                      className="flex-1 px-4 lg:px-6 py-3 lg:py-4 rounded-2xl font-bold text-[9px] lg:text-[10px] uppercase tracking-widest text-text-muted bg-border-subtle hover:bg-border-strong transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmDeleteTeacher}
                      className="flex-1 px-4 lg:px-6 py-3 lg:py-4 rounded-2xl font-bold text-[9px] lg:text-[10px] uppercase tracking-widest text-white bg-red-500 hover:bg-red-600 transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Mobile Bottom Navigation */}
        {!selectedTeacher && !brainTeacherId && !topicsTeacherId && (
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-bg-card/95 backdrop-blur-xl border-t border-border-strong z-[40] flex items-center justify-around px-4 pb-safe">
            <button 
              onClick={() => setActiveTab('professores')}
              className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'professores' ? 'text-text-primary' : 'text-text-muted'}`}
            >
              <GraduationCap size={20} className={activeTab === 'professores' ? 'scale-110' : ''} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Profs</span>
            </button>
            <button 
              onClick={() => setActiveTab('mentores')}
              className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'mentores' ? 'text-text-primary' : 'text-text-muted'}`}
            >
              <Users size={20} className={activeTab === 'mentores' ? 'scale-110' : ''} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Mentores</span>
            </button>
            <button 
              onClick={() => setActiveTab('biblioteca')}
              className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'biblioteca' ? 'text-text-primary' : 'text-text-muted'}`}
            >
              <LibraryIcon size={20} className={activeTab === 'biblioteca' ? 'scale-110' : ''} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Livros</span>
            </button>
          </nav>
        )}

        <AnimatePresence>
          {viewingSnippetsBook && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-bg-card border border-border-strong rounded-[24px] lg:rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] lg:max-h-[80vh]"
              >
                <div className="p-4 lg:p-8 border-b border-border-subtle flex items-center justify-between">
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div className="p-2 lg:p-3 bg-blue-500/10 text-blue-400 rounded-xl lg:rounded-2xl">
                        <FileText size={20} className="lg:w-6 lg:h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg lg:text-xl font-bold text-text-primary">Notas</h2>
                        <p className="text-xs lg:text-sm text-text-muted line-clamp-1">{viewingSnippetsBook.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 lg:gap-2">
                    <button 
                      onClick={() => handleExportTxt(viewingSnippetsBook)}
                      className="p-2 hover:bg-border-subtle rounded-xl text-text-muted hover:text-text-primary transition-colors flex items-center"
                      title="Exportar TXT"
                    >
                      <span className="text-[10px] lg:text-xs font-bold mr-1 hidden sm:inline">TXT</span>
                      <Download size={16} />
                    </button>
                    <button 
                      onClick={() => handleExportPdf(viewingSnippetsBook)}
                      className="p-2 hover:bg-border-subtle rounded-xl text-text-muted hover:text-text-primary transition-colors flex items-center"
                      title="Exportar PDF"
                    >
                      <span className="text-[10px] lg:text-xs font-bold mr-1 hidden sm:inline">PDF</span>
                      <Download size={16} />
                    </button>
                    <div className="w-px h-6 bg-border-subtle mx-1 lg:mx-2" />
                    <button 
                      onClick={() => setViewingSnippetsBookId(null)}
                      className="p-2 hover:bg-border-subtle rounded-xl text-text-muted hover:text-text-primary transition-colors"
                    >
                      <X size={20} className="lg:w-6 lg:h-6" />
                    </button>
                  </div>
                </div>
                <div className="p-4 lg:p-8 overflow-y-auto space-y-4">
                  {!viewingSnippetsBook.snippets || viewingSnippetsBook.snippets.length === 0 ? (
                    <div className="text-center py-12 text-text-muted">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Nenhuma nota salva ainda.</p>
                        <p className="text-xs mt-2 opacity-60">Selecione textos no leitor de PDF para salvar aqui.</p>
                    </div>
                  ) : (
                    viewingSnippetsBook.snippets.map((snippet, idx) => (
                        <div key={idx} className="bg-bg-main border border-border-subtle p-4 lg:p-6 rounded-xl lg:rounded-2xl relative group">
                            {editingSnippet?.index === idx ? (
                              <div className="space-y-3">
                                <textarea
                                  value={editingSnippet.text}
                                  onChange={(e) => setEditingSnippet({ ...editingSnippet, text: e.target.value })}
                                  className="w-full bg-bg-card border border-border-strong rounded-xl p-3 text-xs lg:text-sm text-text-primary focus:outline-none focus:border-text-primary min-h-[100px]"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setEditingSnippet(null)}
                                    className="px-3 py-1.5 rounded-lg text-[10px] lg:text-xs font-bold text-text-muted hover:bg-border-subtle"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => {
                                      updateSnippet(viewingSnippetsBook.id, idx, editingSnippet.text);
                                      setEditingSnippet(null);
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-[10px] lg:text-xs font-bold bg-text-primary text-bg-main hover:opacity-90"
                                  >
                                    Salvar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-text-primary text-xs lg:text-sm leading-relaxed italic">"{snippet}"</p>
                                <div className="absolute top-2 right-2 lg:top-4 lg:right-4 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex gap-1 lg:gap-2 bg-bg-main pl-2">
                                    <button 
                                        onClick={() => setEditingSnippet({ index: idx, text: snippet })}
                                        className="p-1.5 lg:p-2 bg-bg-card border border-border-subtle rounded-lg text-text-muted hover:text-text-primary hover:bg-border-subtle transition-colors"
                                        title="Editar"
                                    >
                                        <Edit2 size={12} className="lg:w-3.5 lg:h-3.5" />
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (confirm('Tem certeza que deseja excluir esta nota?')) {
                                              deleteSnippet(viewingSnippetsBook.id, idx);
                                            }
                                        }}
                                        className="p-1.5 lg:p-2 bg-bg-card border border-border-subtle rounded-lg text-red-400 hover:text-red-500 hover:bg-border-subtle transition-colors"
                                        title="Excluir"
                                    >
                                        <Trash2 size={12} className="lg:w-3.5 lg:h-3.5" />
                                    </button>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(snippet);
                                            alert('Copiado para a área de transferência!');
                                        }}
                                        className="p-1.5 lg:p-2 bg-bg-card border border-border-subtle rounded-lg text-text-muted hover:text-text-primary hover:bg-border-subtle transition-colors"
                                        title="Copiar"
                                    >
                                        <FileText size={12} className="lg:w-3.5 lg:h-3.5" />
                                    </button>
                                </div>
                              </>
                            )}
                        </div>
                    ))
                  )}
                </div>
                <div className="p-4 lg:p-6 border-t border-border-subtle bg-bg-main/50">
                    <button
                        onClick={() => setViewingSnippetsBookId(null)}
                        className="w-full py-3 lg:py-4 bg-bg-card border border-border-subtle rounded-xl lg:rounded-2xl text-text-primary font-bold text-[10px] lg:text-xs uppercase tracking-widest hover:bg-border-subtle transition-colors"
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
