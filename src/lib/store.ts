import { create } from 'zustand';
import { Language } from './i18n';

export interface Job {
  id: string;
  job_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  job_type: string;
  priority: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  description: string | null;
  base_price: number;
  material_cost: number;
  discount: number;
  total_price: number;
  deposit_amount: number;
  payment_method: string;
  payment_status: string;
  amount_paid: number;
  job_status: string;
  assigned_staff_id: string | null;
  created_by: string | null;
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
