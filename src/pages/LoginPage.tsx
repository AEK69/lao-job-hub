import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Lock, AlertCircle } from 'lucide-react';

const LoginPage = () => {
  const { language } = useAppStore();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Translations
  const t = (lo: string, en: string) => language === 'en' ? en : lo;

  // If already logged in, redirect
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <Lock className="w-8 h-8 text-primary mx-auto" />
          </div>
          <p className="text-muted-foreground">{t('ກຳລັງໂຫຼດ...', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Remove any whitespace from email
      const cleanEmail = email.trim().toLowerCase();
      
      if (!cleanEmail || !password) {
        setError(t('ກະລຸນາກວນເອກະສານໃຫ້ຄົບ', 'Please fill in all fields'));
        setLoading(false);
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (signInError) {
        setError(t('ອີເມລ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ', 'Invalid email or password'));
        setPassword('');
        return;
      }

      if (data.user) {
        toast.success(t('ເຂົ້າສູ່ລະບົບສຳເລັດ', 'Login successful'));
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(t('ເກີດຄວາມຜິດພາດ: ' + err.message, 'Error: ' + err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 shadow-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('ເຂົ້າສູ່ລະບົບ', 'Login')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('WorkDay - ລະບົບຈັດການງານ', 'WorkDay - Job Management')}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                {t('ອີເມລ', 'Email')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t('example@domain.com', 'example@domain.com')}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                disabled={loading}
                className="h-10 bg-white"
                autoComplete="email"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                {t('ລະຫັດຜ່ານ', 'Password')}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                disabled={loading}
                className="h-10 bg-white"
                autoComplete="current-password"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!email || !password || loading}
              className="w-full h-10 font-medium"
            >
              {loading ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⏳</span>
                  {t('ກຳລັງເຂົ້າສູ່ລະບົບ...', 'Logging in...')}
                </span>
              ) : (
                t('ເຂົ້າສູ່ລະບົບ', 'Login')
              )}
            </Button>
          </form>

          {/* Footer Note */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-center text-sm text-muted-foreground">
            {t('ໃຫ້ຕິດຕໍ່ Admin ເພື່ອສ້າງບັນຊີ', 'Contact Admin to create an account')}
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginPage;
