import { useAppStore } from '@/lib/store';
import { t, Language } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const flags: Record<Language, string> = { lo: '🇱🇦', th: '🇹🇭', en: '🇬🇧' };

export function LanguageSwitcher() {
  const { language, setLanguage } = useAppStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <span className="text-lg">{flags[language]}</span>
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(['lo', 'th', 'en'] as Language[]).map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => setLanguage(lang)}
            className={language === lang ? 'bg-primary-light' : ''}
          >
            <span className="mr-2 text-lg">{flags[lang]}</span>
            {t(`lang.${lang}` as any, language)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
