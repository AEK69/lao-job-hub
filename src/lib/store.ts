import { create } from 'zustand';
import { Language } from './i18n';

export interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  district: string;
  salary: string;
  salaryType: 'day' | 'month';
  phone: string;
  address: string;
  postType: 'hiring' | 'seeking';
  posterName: string;
  isUrgent: boolean;
  createdAt: string;
  lat?: number;
  lng?: number;
}

interface AppState {
  language: Language;
  setLanguage: (lang: Language) => void;
  jobs: Job[];
  addJob: (job: Omit<Job, 'id' | 'createdAt'>) => void;
  deleteJob: (id: string) => void;
}

const sampleJobs: Job[] = [
  {
    id: '1', title: 'ພະນັກງານເສີບ', description: 'ຕ້ອງການພະນັກງານເສີບອາຫານ ປະຈຳຮ້ານ ໃກ້ຕະຫຼາດເຊົ້າ ເຮັດວຽກ 8 ຊົ່ວໂມງ ມີອາຫານສ່ວນຫຼຸດ',
    category: 'restaurant', district: 'chanthabouly', salary: '150000', salaryType: 'day',
    phone: '020 55 123 456', address: 'ຖະໜົນສາມແສນໄທ, ຈັນທະບູລີ', postType: 'hiring',
    posterName: 'ຮ້ານອາຫານ ລາວລົດຊາດ', isUrgent: true, createdAt: new Date(Date.now() - 3600000).toISOString(),
    lat: 17.9757, lng: 102.6331
  },
  {
    id: '2', title: 'ຊ່າງກໍ່ສ້າງ', description: 'ຕ້ອງການຊ່າງກໍ່ສ້າງ 5 ຄົນ ສ້າງເຮືອນ 2 ຊັ້ນ ຢູ່ໄຊເສດຖາ ລວມອາຫານກາງເວັນ',
    category: 'construction', district: 'xaysetha', salary: '200000', salaryType: 'day',
    phone: '020 99 876 543', address: 'ບ້ານໂພນສະຫວາງ, ໄຊເສດຖາ', postType: 'hiring',
    posterName: 'ບໍລິສັດ ສ້າງດີ', isUrgent: false, createdAt: new Date(Date.now() - 7200000).toISOString(),
    lat: 17.9685, lng: 102.6500
  },
  {
    id: '3', title: 'ຂັບລົດສົ່ງເຄື່ອງ', description: 'ຫາວຽກຂັບລົດສົ່ງເຄື່ອງ ມີລົດມໍເຕີໄຊເອງ ພ້ອມເລີ່ມວຽກທັນທີ ມີປະສົບການ 2 ປີ',
    category: 'delivery', district: 'sisattanak', salary: '4000000', salaryType: 'month',
    phone: '020 77 555 888', address: 'ບ້ານໂພນທັນ, ສີສັດຕະນາກ', postType: 'seeking',
    posterName: 'ທ. ສົມພອນ', isUrgent: false, createdAt: new Date(Date.now() - 10800000).toISOString(),
    lat: 17.9600, lng: 102.6200
  },
  {
    id: '4', title: 'ແມ່ບ້ານທຳຄວາມສະອາດ', description: 'ຕ້ອງການແມ່ບ້ານ 2 ຄົນ ທຳຄວາມສະອາດຫ້ອງການ ຈັນ-ສຸກ ເຊົ້າ-ບ່າຍ',
    category: 'cleaning', district: 'sikhottabong', salary: '3500000', salaryType: 'month',
    phone: '020 22 333 444', address: 'ຖະໜົນລ້ານຊ້າງ, ສີໂຄດຕະບອງ', postType: 'hiring',
    posterName: 'ຫ້ອງການ ABC', isUrgent: true, createdAt: new Date(Date.now() - 1800000).toISOString(),
    lat: 17.9700, lng: 102.6100
  },
  {
    id: '5', title: 'ພະນັກງານຂາຍ', description: 'ຮັບສະໝັກພະນັກງານຂາຍປະຈຳຮ້ານ ມີຄອມມິດຊັ່ນ ບໍ່ຈຳກັດເພດ ອາຍຸ 18-35',
    category: 'shop', district: 'hadxaifong', salary: '3000000', salaryType: 'month',
    phone: '020 88 999 111', address: 'ຕະຫຼາດທົ່ງຂັນຄຳ, ຫາດຊາຍຟອງ', postType: 'hiring',
    posterName: 'ຮ້ານ ໂຊກດີ', isUrgent: false, createdAt: new Date(Date.now() - 14400000).toISOString(),
    lat: 17.9550, lng: 102.6700
  },
];

export const useAppStore = create<AppState>((set) => ({
  language: 'lo',
  setLanguage: (lang) => set({ language: lang }),
  jobs: sampleJobs,
  addJob: (job) => set((state) => ({
    jobs: [{ ...job, id: Date.now().toString(), createdAt: new Date().toISOString() }, ...state.jobs]
  })),
  deleteJob: (id) => set((state) => ({
    jobs: state.jobs.filter(j => j.id !== id)
  })),
}));
