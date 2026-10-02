import { useState, useEffect } from 'react';
import { getProfileSettings, saveProfileSettings } from '../services/firestoreService';
import { uploadProfileAvatar, getStorageUrl } from '../services/storageService';

export function useProfile() {
  const [name, setName] = useState<string>(() => localStorage.getItem('userName') || 'Leitor de Alexandria');
  const [avatarUrl, setAvatarUrl] = useState<string>(() => localStorage.getItem('userImage') || '/avatars/default.svg');
  const [plan, setPlan] = useState<string>(() => localStorage.getItem('userPlan') || 'Starter');
  const [isLoading, setIsLoading] = useState(true);

  // Load profile from Firestore on mount
  useEffect(() => {
    let isCancelled = false;

    async function loadProfile() {
      try {
        const profile = await getProfileSettings();
        if (!isCancelled && profile) {
          setName(profile.name || 'Leitor de Alexandria');
          setPlan(profile.plan || 'Starter');
          const finalAvatar = profile.avatarUrl || profile.avatarPath || '/avatars/default.svg';
          setAvatarUrl(finalAvatar);

          localStorage.setItem('userName', profile.name || 'Leitor de Alexandria');
          localStorage.setItem('userPlan', profile.plan || 'Starter');
          localStorage.setItem('userImage', finalAvatar);
        }
      } catch (e) {
        console.error('Failed to load profile from Firestore:', e);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isCancelled = true;
    };
  }, []);

  /**
   * Updates profile name and/or avatar locally and in Firestore
   */
  const updateProfile = async (
    newName: string,
    imageFile?: File | Blob,
    newPlan?: string
  ) => {
    setName(newName);
    localStorage.setItem('userName', newName);

    let nextAvatarUrl = avatarUrl;

    if (imageFile) {
      try {
        // Compress avatar to compact base64 data URL
        const uploadRes = await uploadProfileAvatar(imageFile);
        nextAvatarUrl = uploadRes.downloadUrl;
        setAvatarUrl(nextAvatarUrl);
        localStorage.setItem('userImage', nextAvatarUrl);
      } catch (err) {
        console.error('Failed to process avatar:', err);
      }
    }

    if (newPlan) {
      setPlan(newPlan);
      localStorage.setItem('userPlan', newPlan);
    }

    // Save directly to Firestore profile/settings
    try {
      await saveProfileSettings({
        name: newName,
        avatarUrl: nextAvatarUrl,
        avatarPath: nextAvatarUrl,
        plan: newPlan || plan,
      });
    } catch (err) {
      console.error('Failed to save profile to Firestore:', err);
    }
  };

  return {
    name,
    avatarUrl,
    plan,
    isLoading,
    updateProfile,
    refreshProfile: async () => {
      const p = await getProfileSettings();
      if (p) {
        setName(p.name);
        if (p.avatarUrl || p.avatarPath) setAvatarUrl(p.avatarUrl || p.avatarPath || '');
        if (p.plan) setPlan(p.plan);
      }
    }
  };
}
