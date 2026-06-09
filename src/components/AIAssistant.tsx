import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Send, Loader2, Copy, Check, List, MessageSquare, FileText, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type Mode = 'chat' | 'summary' | 'template';
type Msg = { role: 'user' | 'assistant'; content: string; mode?: Mode };

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

const T = {
  greeting: {
    lo: 'ສະບາຍດີ! ຂ້ອຍແມ່ນຜູ້ຊ່ວຍ AI 🤖 ເລືອກໂໝດ ຫຼື ກົດປຸ່ມລັດດ້ານລຸ່ມ',
    th: 'สวัสดี! ผมคือผู้ช่วย AI 🤖 เลือกโหมดหรือกดปุ่มลัดด้านล่าง',
    en: 'Hi! I\'m your AI assistant 🤖 Pick a mode or use the shortcuts below',
  },
  placeholder: { lo: 'ພິມຄຳຖາມ...', th: 'พิมพ์คำถาม...', en: 'Type your question...' },
  modeChat: { lo: 'ສົນທະນາ', th: 'แชท', en: 'Chat' },
  modeSummary: { lo: 'ສະຫຼຸບ', th: 'สรุปสั้น', en: 'Summary' },
  modeTemplate: { lo: 'ເທມເພລດ', th: 'เทมเพลต', en: 'Template' },
  copy: { lo: 'ກັອບປີ້', th: 'คัดลอก', en: 'Copy' },
  copied: { lo: 'ກັອບປີ້ແລ້ວ', th: 'คัดลอกแล้ว', en: 'Copied' },
  fillForm: { lo: 'ນຳໄປໂພສງານ', th: 'นำไปโพสงาน', en: 'Use in Post Job' },
  title: { lo: 'ຜູ້ຊ່ວຍ AI', th: 'ผู้ช่วย AI', en: 'AI Assistant' },
  shortcuts: { lo: 'ປຸ່ມລັດ', th: 'ปุ่มลัด', en: 'Shortcuts' },
} as const;

const SHORTCUTS = [
  {
    id: 'find',
    icon: MapPin,
    mode: 'summary' as Mode,
    label: { lo: 'ຫາວຽກໃກ້ຂ້ອຍ', th: 'หางานใกล้ฉัน', en: 'Find jobs near me' },
    prompt: {
      lo: 'ແນະນຳວຽກດ່ວນທີ່ນິຍົມຫຼາຍໃນລາວຕອນນີ້ ພ້ອມວິທີຫາ',
      th: 'แนะนำงานด่วนยอดนิยมในลาวตอนนี้ พร้อมวิธีหา',
      en: 'Suggest popular urgent jobs in Laos right now and how to find them',
    },
  },
  {
    id: 'post',
    icon: FileText,
    mode: 'template' as Mode,
    label: { lo: 'ຊ່ວຍຂຽນໂພສຈ້າງ', th: 'ช่วยเขียนโพสจ้าง', en: 'Help write a job post' },
    prompt: {
      lo: 'ສ້າງເທມເພລດໂພສຈ້າງຄົນທຳຄວາມສະອາດເຮືອນ',
      th: 'สร้างเทมเพลตโพสจ้างคนทำความสะอาดบ้าน',
      en: 'Create a template to hire a house cleaner',
    },
  },
  {
    id: 'price',
    icon: List,
    mode: 'summary' as Mode,
    label: { lo: 'ລາຄາວຽກໃນລາວ', th: 'ราคางานในลาว', en: 'Job rates in Laos' },
    prompt: {
      lo: 'ສະຫຼຸບລາຄາສະເລ່ຍຂອງງານທີ່ນິຍົມໃນລາວ ເປັນກີບ',
      th: 'สรุปราคาเฉลี่ยของงานยอดนิยมในลาว เป็นกีบ',
      en: 'Summarize average rates for popular jobs in Laos in LAK',
    },
  },
] as const;

function parseBullets(text: string): string[] {
  return text.split('\n').map(l => l.replace(/^[-*•]\s*/, '').trim()).filter(Boolean).slice(0, 8);
}

function parseTemplate(text: string): { title?: string; description?: string; price?: string; location?: string } | null {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const raw = (m ? m[1] : text).trim();
  try {
    const o = JSON.parse(raw);
    if (typeof o === 'object' && o) return o;
  } catch { /* */ }
  return null;
}

function CopyBtn({ text, label, copied }: { text: string; label: string; copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setDone(true);
        toast.success(copied);
        setTimeout(() => setDone(false), 1500);
      }}
      className="h-7 text-xs"
    >
      {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {label}
    </Button>
  );
}

export function AIAssistant() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useAppStore();
  const { user, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>('chat');
  const [messages, setMessages] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', content: T.greeting[language] }]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, language, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Hooks MUST run unconditionally — gate rendering AFTER all hooks
  if (location.pathname.startsWith('/admin')) return null;
  if (!user) return null;

  const sendText = async (text: string, useMode: Mode = mode) => {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages([...next, { role: 'assistant', content: '', mode: useMode }]);
    setBusy(true);
    try {
      const accessToken = session?.access_token
        || (await supabase.auth.getSession()).data.session?.access_token;
      if (!accessToken) throw new Error('Not authenticated');
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          mode: useMode,
          lang: language,
          messages: next.filter(m => m.content).map(m => ({ role: m.role, content: m.content })),
        }),
      });
      if (res.status === 401) throw new Error(language === 'lo' ? 'ກະລຸນາເຂົ້າສູ່ລະບົບ' : 'Please sign in');
      if (res.status === 429) throw new Error(language === 'lo' ? 'ໃຊ້ຫຼາຍເກີນໄປ ລອງໃໝ່' : 'Rate limited');
      if (res.status === 402) throw new Error(language === 'lo' ? 'ຫຼຽນ AI ໝົດ' : 'AI credits exhausted');
      if (!res.ok || !res.body) throw new Error(`Error ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = ''; let acc = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop() || '';
        for (const line of lines) {
          const l = line.trim();
          if (!l.startsWith('data:')) continue;
          const data = l.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const j = JSON.parse(data);
            const d = j.choices?.[0]?.delta?.content;
            if (d) {
              acc += d;
              setMessages(m => {
                const c = [...m];
                c[c.length - 1] = { role: 'assistant', content: acc, mode: useMode };
                return c;
              });
            }
          } catch { /* */ }
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'AI error');
      setMessages(m => m.slice(0, -1));
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendText(text);
  };

  const handleShortcut = (s: typeof SHORTCUTS[number]) => {
    setMode(s.mode);
    sendText(s.prompt[language], s.mode);
  };

  const useTemplate = (tpl: any) => {
    try {
      sessionStorage.setItem('ai_job_template', JSON.stringify(tpl));
      navigate('/post');
      setOpen(false);
      toast.success(language === 'lo' ? 'ໂຫຼດຂໍ້ມູນແລ້ວ' : language === 'th' ? 'โหลดข้อมูลแล้ว' : 'Loaded');
    } catch { /* */ }
  };

  const renderMsg = (m: Msg, i: number) => {
    if (m.role === 'user') {
      return (
        <div key={i} className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2 text-sm whitespace-pre-wrap">
            {m.content}
          </div>
        </div>
      );
    }
    // assistant
    if (m.mode === 'summary' && m.content) {
      const bullets = parseBullets(m.content);
      if (bullets.length > 0) {
        return (
          <div key={i} className="space-y-2">
            {bullets.map((b, k) => (
              <Card key={k} className="p-3 flex gap-3 items-start border-l-4 border-l-primary shadow-sm">
                <Badge variant="secondary" className="rounded-full h-6 w-6 p-0 flex items-center justify-center shrink-0 text-xs">
                  {k + 1}
                </Badge>
                <div className="text-sm leading-relaxed flex-1">{b}</div>
              </Card>
            ))}
            <div className="flex justify-end">
              <CopyBtn text={bullets.map((b, k) => `${k + 1}. ${b}`).join('\n')} label={T.copy[language]} copied={T.copied[language]} />
            </div>
          </div>
        );
      }
    }
    if (m.mode === 'template' && m.content) {
      const tpl = parseTemplate(m.content);
      if (tpl) {
        const fullText = [
          tpl.title && `📌 ${tpl.title}`,
          tpl.description,
          tpl.price && `💰 ${tpl.price}`,
          tpl.location && `📍 ${tpl.location}`,
        ].filter(Boolean).join('\n\n');
        return (
          <Card key={i} className="p-4 space-y-3 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
            {tpl.title && (
              <div>
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">Title</div>
                <div className="font-bold text-base">{tpl.title}</div>
              </div>
            )}
            {tpl.description && (
              <div>
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">Description</div>
                <div className="text-sm whitespace-pre-wrap">{tpl.description}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {tpl.price && (
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground font-semibold">Price</div>
                  <div className="text-sm font-semibold text-primary">{tpl.price}</div>
                </div>
              )}
              {tpl.location && (
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground font-semibold">Location</div>
                  <div className="text-sm">{tpl.location}</div>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <CopyBtn text={fullText} label={T.copy[language]} copied={T.copied[language]} />
              <Button size="sm" onClick={() => useTemplate(tpl)} className="h-7 text-xs">
                {T.fillForm[language]}
              </Button>
            </div>
          </Card>
        );
      }
    }
    return (
      <div key={i} className="flex justify-start">
        <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2 text-sm">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{m.content || '...'}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Floating button — sits ABOVE bottom nav on mobile (h-16 + safe area) */}
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed z-40 right-3 h-12 w-12 md:h-14 md:w-14 rounded-full shadow-xl bg-gradient-to-br from-primary to-accent hover:scale-105 transition-transform"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom) + 4.5rem)',
        }}
        aria-label="AI Assistant"
      >
        <Sparkles className="h-5 w-5 md:h-6 md:w-6" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[88vh] p-0 flex flex-col rounded-t-2xl gap-0">
          <SheetHeader className="px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-accent/10 space-y-2">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-left">
                <Sparkles className="h-5 w-5 text-primary" />
                {T.title[language]}
              </SheetTitle>
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* Mode tabs */}
            <div className="flex gap-1.5">
              {([
                { id: 'chat' as Mode, icon: MessageSquare, label: T.modeChat[language] },
                { id: 'summary' as Mode, icon: List, label: T.modeSummary[language] },
                { id: 'template' as Mode, icon: FileText, label: T.modeTemplate[language] },
              ]).map(t => (
                <Button
                  key={t.id}
                  size="sm"
                  variant={mode === t.id ? 'default' : 'outline'}
                  onClick={() => setMode(t.id)}
                  className="h-8 text-xs flex-1"
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </Button>
              ))}
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-3" ref={scrollRef as any}>
            <div className="py-4 space-y-3">
              {messages.map(renderMsg)}
              {busy && messages[messages.length - 1]?.content === '' && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick action shortcuts */}
          <div className="border-t px-3 py-2 bg-muted/30 flex gap-2 overflow-x-auto scrollbar-hide">
            {SHORTCUTS.map(s => (
              <Button
                key={s.id}
                size="sm"
                variant="outline"
                onClick={() => handleShortcut(s)}
                disabled={busy}
                className="h-8 text-xs whitespace-nowrap shrink-0 rounded-full"
              >
                <s.icon className="h-3 w-3" />
                {s.label[language]}
              </Button>
            ))}
          </div>

          <div className="border-t p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] bg-card flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={T.placeholder[language]}
              disabled={busy}
              className="flex-1 rounded-full border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button onClick={handleSend} disabled={busy || !input.trim()} size="icon" className="rounded-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
