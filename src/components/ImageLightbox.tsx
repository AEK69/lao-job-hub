import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Props {
  images: { id: string; image_url: string; image_type: string | null; created_at: string | null }[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageLightbox({ images, initialIndex = 0, open, onOpenChange }: Props) {
  const [idx, setIdx] = useState(initialIndex);
  const img = images[idx];
  if (!img) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
        <div className="relative flex items-center justify-center min-h-[60vh]">
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-white z-10" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
          </Button>
          {images.length > 1 && (
            <>
              <Button variant="ghost" size="icon" className="absolute left-2 text-white" onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}>
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className="absolute right-2 text-white" onClick={() => setIdx(i => (i + 1) % images.length)}>
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
          <img src={img.image_url} alt="" className="max-h-[80vh] max-w-full object-contain" />
        </div>
        <div className="text-center text-white/70 text-xs pb-3">
          {idx + 1} / {images.length} {img.image_type && `• ${img.image_type}`}
        </div>
      </DialogContent>
    </Dialog>
  );
}
