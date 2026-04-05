import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  phone: string | null;
  avatar_url: string | null;
  district: string | null;
  bio: string | null;
  coin_balance: number;
  kyc_status: string;
  id_card_url: string | null;
  date_of_birth: string | null;
  is_student: boolean;
  guardian_name: string | null;
  guardian_phone: string | null;
  full_name: string | null;
  address: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    setProfile(data as Profile | null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Poll for KYC status changes (notification)
  useEffect(() => {
    if (!user || !profile) return;
    const prevStatus = profile.kyc_status;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('kyc_status')
        .eq('user_id', user.id)
        .single();
      if (data && data.kyc_status !== prevStatus) {
        await fetchProfile(user.id);
        if (data.kyc_status === 'approved') {
          // Dynamic import to avoid circular deps
          import('sonner').then(({ toast }) => {
            toast.success('🎉 ບັນຊີຂອງທ່ານໄດ້ຮັບການຢືນຢັນແລ້ວ! / Your account has been verified!');
          });
        } else if (data.kyc_status === 'rejected') {
          import('sonner').then(({ toast }) => {
            toast.error('❌ ການຢືນຢັນຖືກປະຕິເສດ / Verification rejected');
          });
        }
      }
    }, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [user, profile?.kyc_status]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
