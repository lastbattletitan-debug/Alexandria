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

export type Teacher = {
  id: string;
  name: string;
  role: string;
  category: string;
  imageUrl: string;
  systemInstruction: string;
  files: TeacherFile[];
  chatHistory: ChatMessage[];
};
