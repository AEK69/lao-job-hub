import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Edit, Plus, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

interface Service { id: string; name: string; base_price: number; active: boolean; }
interface CompanySettings { id: string; company_name: string; phone: string | null; address: string | null; logo_url: string | null; receipt_footer: string | null; }

const SettingsPage = () => {
  const { language } = useAppStore();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', base_price: 0 });
  const [newService, setNewService] = useState({ name: '', base_price: 0 });
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [companyForm, setCompanyForm] = useState({ company_name: '', phone: '', address: '', receipt_footer: '' });

  const l = (lo: string, en: string) => language === 'en' ? en : lo;

  useEffect(() => {
    loadServices();
    loadCompany();
  }, []);

  const loadServices = async () => {
    const { data } = await supabase.from('services').select('*').order('name');
    setServices((data || []) as Service[]);
  };

  const loadCompany = async () => {
    const { data } = await supabase.from('company_settings').select('*').limit(1).single();
    if (data) {
      setCompany(data as any);
      setCompanyForm({ company_name: data.company_name || '', phone: data.phone || '', address: data.address || '', receipt_footer: data.receipt_footer || '' });
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from('services').update({ active } as any).eq('id', id);
    loadServices();
  };

  const handleSaveEdit = async (id: string) => {
    const { error } = await supabase.from('services').update({ name: editForm.name, base_price: editForm.base_price } as any).eq('id', id);
    if (error) toast.error(error.message); else { toast.success(l('ບັນທຶກແລ້ວ', 'Saved')); setEditingId(null); loadServices(); }
  };

  const handleAddService = async () => {
    if (!newService.name) return;
    const { error } = await supabase.from('services').insert({ name: newService.name, base_price: newService.base_price } as any);
    if (error) toast.error(error.message); else { toast.success(l('ເພີ່ມແລ້ວ', 'Added')); setNewService({ name: '', base_price: 0 }); loadServices(); }
  };

  const handleDeleteService = async (id: string, name: string) => {
    // Check if referenced
    const { count } = await supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('job_type', name);
    if ((count || 0) > 0) { toast.error(l(`ບໍ່ສາມາດລົບ — ມີ ${count} ງານໃຊ້ບໍລິການນີ້`, `Cannot delete — ${count} jobs use this service`)); return; }
    const r = await Swal.fire({ icon: 'warning', title: l('ລົບບໍລິການ?', 'Delete service?'), showCancelButton: true, confirmButtonColor: '#ef4444' });
    if (!r.isConfirmed) return;
    await supabase.from('services').delete().eq('id', id);
    toast.success(l('ລົບແລ້ວ', 'Deleted')); loadServices();
  };

  const handleSaveCompany = async () => {
    if (!company) return;
    const { error } = await supabase.from('company_settings').update(companyForm as any).eq('id', company.id);
    if (error) toast.error(error.message); else toast.success(l('ບັນທຶກແລ້ວ', 'Saved'));
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="services">{l('ບໍລິການ', 'Services')}</TabsTrigger>
          <TabsTrigger value="company">{l('ຂໍ້ມູນບໍລິສັດ', 'Company')}</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4 mt-4">
          {services.map(svc => (
            <Card key={svc.id} className="p-4">
              {editingId === svc.id ? (
                <div className="flex gap-2 items-end flex-wrap">
                  <div className="flex-1 min-w-[150px]"><Label>{l('ຊື່', 'Name')}</Label><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="w-32"><Label>{l('ລາຄາ', 'Price')}</Label><Input type="number" value={editForm.base_price} onChange={e => setEditForm(f => ({ ...f, base_price: Number(e.target.value) }))} /></div>
                  <Button size="sm" onClick={() => handleSaveEdit(svc.id)}><Save className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>{l('ຍົກເລີກ', 'Cancel')}</Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{svc.name}</span>
                    <span className="ml-3 text-sm text-muted-foreground">{svc.base_price.toLocaleString()}₭</span>
                    {!svc.active && <Badge variant="secondary" className="ml-2">{l('ປິດ', 'Inactive')}</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={svc.active} onCheckedChange={v => handleToggleActive(svc.id, v)} />
                    <Button size="sm" variant="ghost" onClick={() => { setEditingId(svc.id); setEditForm({ name: svc.name, base_price: svc.base_price }); }}><Edit className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteService(svc.id, svc.name)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </Card>
          ))}

          <Card className="p-4">
            <div className="flex gap-2 items-end flex-wrap">
              <div className="flex-1 min-w-[150px]"><Label>{l('ຊື່ບໍລິການໃໝ່', 'New Service')}</Label><Input value={newService.name} onChange={e => setNewService(f => ({ ...f, name: e.target.value }))} placeholder={l('ຊື່', 'Name')} /></div>
              <div className="w-32"><Label>{l('ລາຄາ', 'Price')}</Label><Input type="number" value={newService.base_price} onChange={e => setNewService(f => ({ ...f, base_price: Number(e.target.value) }))} /></div>
              <Button onClick={handleAddService} className="gap-1"><Plus className="h-4 w-4" /> {l('ເພີ່ມ', 'Add')}</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="mt-4">
          <Card className="p-6 space-y-4">
            <div><Label>{l('ຊື່ບໍລິສັດ', 'Company Name')}</Label><Input value={companyForm.company_name} onChange={e => setCompanyForm(f => ({ ...f, company_name: e.target.value }))} /></div>
            <div><Label>{l('ເບີໂທ', 'Phone')}</Label><Input value={companyForm.phone} onChange={e => setCompanyForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>{l('ທີ່ຢູ່', 'Address')}</Label><Input value={companyForm.address} onChange={e => setCompanyForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div><Label>{l('ໝາຍເຫດໃນໃບຮັບເງິນ', 'Receipt Footer')}</Label><Textarea value={companyForm.receipt_footer} onChange={e => setCompanyForm(f => ({ ...f, receipt_footer: e.target.value }))} /></div>
            <Button onClick={handleSaveCompany} className="gap-1"><Save className="h-4 w-4" /> {l('ບັນທຶກ', 'Save')}</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
