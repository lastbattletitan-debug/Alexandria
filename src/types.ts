
export type LibraryBook = {
  id: string;
  title: string;
  author?: string;
  coverUrl?: string;
  pageCount: number;
  currentPage: number;
  fileData?: string; // base64 encoded PDF data
  fileName: string;
  createdAt: string;
};

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
