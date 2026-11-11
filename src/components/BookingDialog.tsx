import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createLead, type LeadType } from "@/data/leads";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

const TIME_SLOTS = ["09:00", "11:00", "13:00", "15:00", "17:00", "19:00"];

export function BookingDialog({
  trigger,
  title,
  description,
  leadType,
  carId,
  extraPayload,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  leadType: LeadType;
  carId?: string;
  extraPayload?: Record<string, unknown>;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setDate(undefined);
    setTime(null);
    setName("");
    setPhone("");
    setEmail("");
  };

  const canSubmit = date && time && name.trim() && phone.trim();

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await createLead({
        type: leadType,
        name: name.trim(),
        phone: phone.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(carId ? { carId } : {}),
        payload: {
          date: date!.toISOString().slice(0, 10),
          time,
          ...extraPayload,
        },
      });
      toast.success(t.booking.successTitle, { description: t.booking.successBody });
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(t.booking.errorTitle, {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-hairline bg-sand text-sand-fg sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-sand-fg">{title}</DialogTitle>
          <DialogDescription className="text-sand-fg/60">{description}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={{ before: new Date() }}
            className="rounded-control bg-paper text-ink"
          />
        </div>

        <div>
          <div className="mb-2 text-[11px] tracking-[0.14em] text-sand-fg/55 uppercase">
            {t.booking.timeLabel}
          </div>
          <div className="flex flex-wrap gap-2">
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setTime(slot)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-hairline transition-colors",
                  time === slot ? "bg-brass text-white" : "bg-paper text-ink/70 hover:bg-panel-2",
                )}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.booking.nameLabel}
            className="w-full rounded-control bg-paper px-3 py-2.5 text-sm outline-none ring-1 ring-hairline"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.booking.phoneLabel}
              className="w-full rounded-control bg-paper px-3 py-2.5 text-sm outline-none ring-1 ring-hairline"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.booking.emailLabel}
              type="email"
              className="w-full rounded-control bg-paper px-3 py-2.5 text-sm outline-none ring-1 ring-hairline"
            />
          </div>
        </div>

        <button
          type="button"
          disabled={!canSubmit || submitting}
          onClick={onSubmit}
          className="w-full rounded-control bg-brass px-4 py-3 text-center font-display text-sm font-medium text-white transition-colors hover:bg-brass-2 disabled:opacity-50"
        >
          {submitting ? t.booking.submitting : t.booking.confirmButton}
        </button>
      </DialogContent>
    </Dialog>
  );
}
