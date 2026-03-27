import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';

export function Footer() {
  const { language } = useAppStore();

  return (
    <footer className="border-t bg-card mt-12">
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold text-lg text-primary mb-2">ວຽກດ່ວນ</h3>
            <p className="text-sm text-muted-foreground">{t('footer.aboutText', language)}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">{t('footer.contact', language)}</h4>
            <p className="text-sm text-muted-foreground">📧 info@viekduan.la</p>
            <p className="text-sm text-muted-foreground">📱 020 XX XXX XXX</p>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t text-center text-xs text-muted-foreground">
          © 2026 ວຽກດ່ວນ - Vientiane Job Platform
        </div>
      </div>
    </footer>
  );
}
