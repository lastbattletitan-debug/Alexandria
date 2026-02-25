import { useState, useEffect } from 'react';
import localforage from 'localforage';
import { SavedChat } from '../types';

const SAVED_CHATS_KEY = 'saved_chats';

export function useSavedChats() {
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSavedChats = async () => {
      try {
        const chats = await localforage.getItem<SavedChat[]>(SAVED_CHATS_KEY);
        if (chats) {
          setSavedChats(chats);
        }
      } catch (error) {
        console.error('Failed to load saved chats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedChats();
  }, []);

  const saveCurrentChat = async (chat: Omit<SavedChat, 'id' | 'timestamp'>) => {
    try {
      const newChat: SavedChat = {
        ...chat,
        id: `chat_${Date.now()}`,
        timestamp: Date.now(),
      };
      const updatedChats = [...savedChats, newChat];
      await localforage.setItem(SAVED_CHATS_KEY, updatedChats);
      setSavedChats(updatedChats);
      return newChat;
    } catch (error) {
      console.error('Failed to save chat:', error);
    }
  };

  const deleteSavedChat = async (chatId: string) => {
    try {
      const updatedChats = savedChats.filter(chat => chat.id !== chatId);
      await localforage.setItem(SAVED_CHATS_KEY, updatedChats);
      setSavedChats(updatedChats);
    } catch (error) {
      console.error('Failed to delete saved chat:', error);
    }
  };

  return { savedChats, isLoading, saveCurrentChat, deleteSavedChat };
}
