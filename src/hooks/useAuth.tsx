import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface StaffProfile {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  skills: string[];
  status: 'available' | 'busy' | 'off';
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: 'admin' | 'staff' | 'cashier' | null;
  staffProfile: StaffProfile | null;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userRole: null,
  staffProfile: null,
  signOut: async () => {},
  refreshUserData: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'staff' | 'cashier' | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      const role = data?.role as 'admin' | 'staff' | 'cashier' | null || null;
      setUserRole(role);
      
      // Fetch staff profile if user is staff
      if (role === 'staff') {
        const { data: staffData } = await supabase
          .from('staff')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        setStaffProfile(staffData as StaffProfile | null);
      } else {
        setStaffProfile(null);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
      setStaffProfile(null);
    }
  };

  const refreshUserData = async () => {
    if (user) {
      await fetchUserRole(user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Small delay to ensure RLS policies are applied
          setTimeout(() => fetchUserRole(session.user.id), 100);
        } else {
          setUserRole(null);
          setStaffProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setStaffProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, staffProfile, signOut, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
