import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, LogOut, Settings, BarChart3, History, Briefcase, Users } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import DashboardPage from './DashboardPage';
import SettingsPage from './SettingsPage';
import AuditLogPage from './AuditLogPage';
import ReportsPage from './ReportsPage';

const AdminPage = () => {
  const { language } = useAppStore();
  const { user, userRole, signOut } = useAuth();
  const l = (lo: string, en: string) => language === 'en' ? en : lo;

  if (!user) return <Navigate to="/admin-login" />;
  if (userRole !== 'admin') return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="p-8 text-center">
        <span className="text-5xl block mb-4">🔒</span>
        <p className="text-muted-foreground mb-4">{l('ຕ້ອງເປັນ Admin', 'Admin required')}</p>
        <Link to="/"><Button>Home</Button></Link>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 bg-card border-r flex-col shrink-0">
        <div className="p-6 border-b"><h1 className="text-xl font-bold text-primary flex items-center gap-2"><Settings className="h-5 w-5" /> WorkDay Admin</h1></div>
        <nav className="flex-1 p-4 space-y-1">
          <Link to="/"><Button variant="ghost" className="w-full justify-start gap-2"><Home className="h-4 w-4" /> {l('ໜ້າຫຼັກ', 'Home')}</Button></Link>
          <Link to="/jobs"><Button variant="ghost" className="w-full justify-start gap-2"><Briefcase className="h-4 w-4" /> {l('ງານ', 'Jobs')}</Button></Link>
          <Link to="/post"><Button variant="ghost" className="w-full justify-start gap-2">✍️ {l('ສ້າງງານ', 'New Job')}</Button></Link>
        </nav>
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start gap-2 text-destructive" onClick={signOut}><LogOut className="h-4 w-4" /> {l('ອອກ', 'Logout')}</Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-card border-b px-6 py-4 sticky top-0 z-10">
          <h2 className="text-lg font-bold">{l('ແຜງຄວບຄຸມ', 'Admin Dashboard')}</h2>
        </header>

        <div className="p-6">
          <Tabs defaultValue="dashboard">
            <TabsList className="mb-6 flex-wrap">
              <TabsTrigger value="dashboard" className="gap-1"><BarChart3 className="h-4 w-4" /> {l('ພາບລວມ', 'Dashboard')}</TabsTrigger>
              <TabsTrigger value="reports" className="gap-1"><BarChart3 className="h-4 w-4" /> {l('ລາຍງານ', 'Reports')}</TabsTrigger>
              <TabsTrigger value="settings" className="gap-1"><Settings className="h-4 w-4" /> {l('ຕັ້ງຄ່າ', 'Settings')}</TabsTrigger>
              <TabsTrigger value="logs" className="gap-1"><History className="h-4 w-4" /> {l('ບັນທຶກ', 'Logs')}</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard"><DashboardPage /></TabsContent>
            <TabsContent value="reports"><ReportsPage /></TabsContent>
            <TabsContent value="settings"><SettingsPage /></TabsContent>
            <TabsContent value="logs"><AuditLogPage /></TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
