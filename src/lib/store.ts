import { create } from 'zustand';
import { Language } from './i18n';

export interface Job {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  district: string;
  salary: string;
  salary_type: string;
  phone: string;
  address: string;
  post_type: string;
  poster_name: string;
  is_urgent: boolean;
  is_featured: boolean;
  lat?: number | null;
  lng?: number | null;
  work_date?: string | null;
  work_time?: string | null;
  image_url?: string | null;
  accepted_by?: string | null;
  accepted_at?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface AppState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useAppStore = create<AppState>((set) => ({
  language: 'lo',
  setLanguage: (lang) => set({ language: lang }),
}));
