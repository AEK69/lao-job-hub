import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

type Msg = { role: 'user' | 'assistant'; content: string };

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

const greetings = {
  lo: 'ສະບາຍດີ! ຂ້ອຍແມ່ນຜູ້ຊ່ວຍ AI ຂອງ ວຽກດ່ວນ 🤖\nລອງຖາມໄດ້ເລີຍ ເຊັ່ນ "ຫາວຽກທຳຄວາມສະອາດ" ຫຼື "ຊ່ວຍຂຽນໂພສຈ້າງຄົນຂົນເຄື່ອງ"',
  th: 'สวัสดี! ผมคือผู้ช่วย AI ของ ວຽກດ່ວນ 🤖\nลองถามได้เลย เช่น "หางานทำความสะอาด" หรือ "ช่วยเขียนโพสจ้างคนขนของ"',
  en: 'Hi! I\'m the ວຽກດ່ວນ AI assistant 🤖\nTry asking: "Find me a cleaning job" or "Help me write a delivery job post"',
};

const placeholders = {
  lo: 'ພິມຄຳຖາມຂອງເຈົ້າ...',
  th: 'พิมพ์คำถามของคุณ...',
  en: 'Type your question...',
};

export function AIAssistant() {
  const location = useLocation();
  const { language } = useAppStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hide on admin routes
  if (location.pathname.startsWith('/admin')) return null;

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', content: greetings[language] }]);
    }
  }, [open, language, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages([...next, { role: 'assistant', content: '' }]);
    setBusy(true);
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.filter(m => m.content).map(m => ({ role: m.role, content: m.content })),
        }),
      });
      if (res.status === 429) throw new Error(language === 'lo' ? 'ໃຊ້ຫຼາຍເກີນໄປ ລອງໃໝ່ພາຍຫຼັງ' : 'Rate limited, try again later');
      if (res.status === 402) throw new Error(language === 'lo' ? 'ຫຼຽນ AI ໝົດແລ້ວ' : 'AI credits exhausted');
      if (!res.ok || !res.body) throw new Error(`Error ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let acc = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          const l = line.trim();
          if (!l.startsWith('data:')) continue;
          const data = l.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages(m => {
                const copy = [...m];
                copy[copy.length - 1] = { role: 'assistant', content: acc };
                return copy;
              });
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'AI error');
      setMessages(m => m.slice(0, -1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed z-40 right-4 bottom-20 md:bottom-6 h-14 w-14 rounded-full shadow-xl bg-gradient-to-br from-primary to-accent hover:scale-105 transition-transform"
        aria-label="AI Assistant"
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col rounded-t-2xl">
          <SheetHeader className="px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-accent/10">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {language === 'lo' ? 'ຜູ້ຊ່ວຍ AI' : language === 'th' ? 'ผู้ช่วย AI' : 'AI Assistant'}
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 px-3" ref={scrollRef as any}>
            <div className="py-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted rounded-bl-sm'
                    }`}
                  >
                    {m.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{m.content || '...'}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    )}
                  </div>
                </div>
              ))}
              {busy && messages[messages.length - 1]?.content === '' && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] bg-card flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={placeholders[language]}
              disabled={busy}
              className="flex-1 rounded-full border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <Button onClick={send} disabled={busy || !input.trim()} size="icon" className="rounded-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}