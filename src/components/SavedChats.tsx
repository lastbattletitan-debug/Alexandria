import { SavedChat, Teacher } from '../types';
import { Book, Trash2 } from 'lucide-react';

interface SavedChatsProps {
  savedChats: SavedChat[];
  teachers: Teacher[];
  onLoadChat: (chat: SavedChat) => void;
  onDeleteChat: (chatId: string) => void;
}

export function SavedChats({ savedChats, teachers, onLoadChat, onDeleteChat }: SavedChatsProps) {
  const getTeacherName = (teacherId: string) => {
    return teachers.find(t => t.id === teacherId)?.name || 'Professor desconhecido';
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-text-primary mb-6">Histórico de Conversas</h2>
      {savedChats.length === 0 ? (
        <p className="text-text-muted">Nenhuma conversa salva ainda.</p>
      ) : (
        <div className="space-y-4">
          {savedChats.map(chat => (
            <div key={chat.id} className="bg-bg-card border border-border-subtle rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-text-primary">{chat.name}</p>
                <p className="text-sm text-text-muted">{getTeacherName(chat.teacherId)} - {new Date(chat.timestamp).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onLoadChat(chat)}
                  className="p-2 text-text-muted hover:text-text-primary hover:bg-border-subtle rounded-full transition-colors"
                >
                  <Book size={18} />
                </button>
                <button 
                  onClick={() => onDeleteChat(chat.id)}
                  className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
