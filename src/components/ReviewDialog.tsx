import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Star } from 'lucide-react';
import { toast } from 'sonner';

interface ReviewDialogProps {
  open: boolean;
  onClose: () => void;
  reviewedId: string;
  reviewedName: string;
  jobId?: string;
}

export function ReviewDialog({ open, onClose, reviewedId, reviewedName, jobId }: ReviewDialogProps) {
  const { user } = useAuth();
  const { language } = useAppStore();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const l = (lo: string, th: string, en: string) => language === 'en' ? en : language === 'th' ? th : lo;

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast.error(l('ກະລຸນາໃຫ້ຄະແນນ', 'กรุณาให้คะแนน', 'Please give a rating'));
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('reviews').insert({
      reviewer_id: user.id,
      reviewed_id: reviewedId,
      job_id: jobId || null,
      rating,
      comment: comment.trim() || null,
    } as any);

    if (error) {
      if (error.code === '23505') {
        toast.error(l('ທ່ານລີວິວແລ້ວ', 'คุณรีวิวแล้ว', 'You already reviewed'));
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success(l('ຂອບໃຈ!', 'ขอบคุณ!', 'Thanks!'));
      onClose();
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            {l('ລີວິວ', 'รีวิว', 'Review')} {reviewedName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(i)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    i <= (hoverRating || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={l('ຄວາມຄິດເຫັນ (ບໍ່ບັງຄັບ)', 'ความคิดเห็น (ไม่บังคับ)', 'Comment (optional)')}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{l('ຍົກເລີກ', 'ยกเลิก', 'Cancel')}</Button>
          <Button onClick={handleSubmit} disabled={submitting || rating === 0}>
            {l('ສົ່ງ', 'ส่ง', 'Submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
