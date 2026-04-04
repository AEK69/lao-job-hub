import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/lib/store';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, Settings } from 'lucide-react';
import { toast } from 'sonner';

export const UserMenu = () => {
  const { user, userRole, staffProfile, signOut } = useAuth();
  const { language } = useAppStore();
  const navigate = useNavigate();

  const t = (lo: string, en: string) => language === 'en' ? en : lo;

  if (!user) return null;

  const getInitials = () => {
    if (staffProfile?.name) {
      return staffProfile.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return (user.email?.[0] || 'U').toUpperCase();
  };

  const getRoleColor = () => {
    switch (userRole) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'cashier':
        return 'bg-green-100 text-green-800';
      case 'staff':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = () => {
    switch (userRole) {
      case 'admin':
        return t('ຜູ້ບໍລິຫານ', 'Admin');
      case 'cashier':
        return t('ເຄື່ອ', 'Cashier');
      case 'staff':
        return t('ພະນັກງານ', 'Staff');
      default:
        return t('ຜູ້ໃຊ້', 'User');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success(t('ອອກຈາກລະບົບສຳເລັດ', 'Logged out successfully'));
      navigate('/login');
    } catch (error) {
      toast.error(t('ເກີດຄວາມຜິດພາດ', 'Error logging out'));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-white text-xs font-bold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col items-start gap-0.5">
            <span className="text-sm font-medium">
              {staffProfile?.name || user.email?.split('@')[0]}
            </span>
            <Badge variant="secondary" className={`h-5 text-xs ${getRoleColor()}`}>
              {getRoleLabel()}
            </Badge>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {staffProfile?.name || user.email?.split('@')[0]}
            </p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {userRole && (
          <>
            <DropdownMenuItem disabled>
              <Badge variant="outline" className={getRoleColor()}>
                {getRoleLabel()}
              </Badge>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <Settings className="mr-2 w-4 h-4" />
          {t('ປະຕິຕິ', 'Profile')}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem 
          onClick={handleSignOut}
          className="text-red-600 hover:bg-red-50"
        >
          <LogOut className="mr-2 w-4 h-4" />
          {t('ອອກຈາກລະບົບ', 'Sign Out')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
