import { useState, useEffect } from 'react';
import localforage from 'localforage';
import { Teacher, TeacherFile, ChatMessage, Topic } from '../types';

const STORAGE_KEY = 'ai-teachers-bookshelf';

export function useTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const stored = await localforage.getItem<Teacher[]>(STORAGE_KEY);
        if (stored) {
          setTeachers(stored);
        }
      } catch (e) {
        console.error('Failed to parse stored teachers', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTeachers();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      const saveTeachers = async () => {
        try {
          await localforage.setItem(STORAGE_KEY, teachers);
        } catch (e) {
          console.error('Failed to save teachers to localforage', e);
          alert('Aviso: Ocorreu um erro ao salvar os dados. O armazenamento do navegador pode estar cheio.');
        }
      };
      saveTeachers();
    }
  }, [teachers, isLoaded]);

  const addTeacher = (teacher: Omit<Teacher, 'id' | 'files' | 'chatHistory' | 'topics'>) => {
    const newTeacher: Teacher = {
      ...teacher,
      id: crypto.randomUUID(),
      files: [],
      chatHistory: [],
      topics: [],
    };
    setTeachers((prev) => [...prev, newTeacher]);
    return newTeacher;
  };

  const updateTeacher = (id: string, updates: Partial<Teacher>) => {
    setTeachers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const addFileToTeacher = (teacherId: string, file: Omit<TeacherFile, 'id'>) => {
    const newFile: TeacherFile = { ...file, id: crypto.randomUUID() };
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === teacherId ? { ...t, files: [...t.files, newFile] } : t
      )
    );
    return newFile;
  };

  const addMessageToTeacher = (teacherId: string, message: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = { ...message, id: crypto.randomUUID() };
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === teacherId
          ? { ...t, chatHistory: [...t.chatHistory, newMessage] }
          : t
      )
    );
    return newMessage;
  };

  const clearTeacherChat = (teacherId: string) => {
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === teacherId ? { ...t, chatHistory: [] } : t
      )
    );
  };

  const removeFileFromTeacher = (teacherId: string, fileId: string) => {
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === teacherId
          ? { ...t, files: t.files.filter((f) => f.id !== fileId) }
          : t
      )
    );
  };

  const deleteTeacher = (id: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== id));
  };

  const addTopicToTeacher = (teacherId: string, topic: Omit<Topic, 'id' | 'createdAt' | 'chatHistory' | 'status'>) => {
    const newTopic: Topic = {
      ...topic,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      chatHistory: [],
      status: 'in_progress'
    };
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === teacherId ? { ...t, topics: [...(t.topics || []), newTopic] } : t
      )
    );
    return newTopic;
  };

  const updateTopicInTeacher = (teacherId: string, topicId: string, updates: Partial<Topic>) => {
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === teacherId
          ? {
              ...t,
              topics: (t.topics || []).map((topic) =>
                topic.id === topicId ? { ...topic, ...updates } : topic
              ),
            }
          : t
      )
    );
  };

  const deleteTopicFromTeacher = (teacherId: string, topicId: string) => {
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === teacherId
          ? { ...t, topics: (t.topics || []).filter((topic) => topic.id !== topicId) }
          : t
      )
    );
  };

  const addMessageToTopic = (teacherId: string, topicId: string, message: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = { ...message, id: crypto.randomUUID() };
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === teacherId
          ? {
              ...t,
              topics: (t.topics || []).map((topic) =>
                topic.id === topicId
                  ? { ...topic, chatHistory: [...topic.chatHistory, newMessage] }
                  : topic
              ),
            }
          : t
      )
    );
    return newMessage;
  };

  return {
    teachers,
    addTeacher,
    updateTeacher,
    addFileToTeacher,
    removeFileFromTeacher,
    addMessageToTeacher,
    clearTeacherChat,
    deleteTeacher,
    addTopicToTeacher,
    updateTopicInTeacher,
    deleteTopicFromTeacher,
    addMessageToTopic,
  };
}
