export type BookStatus = 'unread' | 'reading' | 'paused' | 'finished';
export type BookFormat = 'md' | 'pdf' | 'epub' | 'txt' | 'other';

export interface BookNote {
  id: string;
  bookId: string;
  page: number;
  content: string;
  selectedText?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  color?: string;
}

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  coverPath: string;
  contentPath: string;
  content?: string;
  hasChapters?: boolean;
  status: BookStatus;
  currentPage: number;
  totalPages: number;
  progress: number; // 0.0 to 1.0
  readingOrder: number;
  favorite: boolean;
  createdAt: string;
  addedAt?: string;
  updatedAt: string;
  lastOpenedAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  currentScrollPosition?: number;
  lastOpenedChapter?: string;
  readingTime?: number; // in seconds
  format?: BookFormat;
  categories?: string[];
  rating?: number;
  // Local runtime cached accessors
  url?: string;
  thumbnail?: string;
  file?: Blob | File;
  snippets?: string[];
  notes?: BookNote[];
}

export interface ProfileSettings {
  name: string;
  avatarPath?: string;
  avatarUrl?: string;
  updatedAt: string;
  plan?: string;
}

export type TeacherFile = {
  id: string;
  name: string;
  mimeType: string;
  data?: string; // base64 encoded data (optional for links)
  url?: string; // for links
  type: 'file' | 'link';
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'model';
  text: string;
};

export type Topic = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  chatHistory: ChatMessage[];
  status: 'in_progress' | 'completed';
};

export type Teacher = {
  id: string;
  name: string;
  role: string;
  specialty: string;
  category: string;
  description?: string;
  imageUrl: string;
  systemInstruction: string;
  personality?: string;
  personalitySources?: string;
  files: TeacherFile[];
  chatHistory: ChatMessage[];
  topics: Topic[];
};
