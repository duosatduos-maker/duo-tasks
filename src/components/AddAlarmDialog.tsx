import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Clock, Moon, Zap, Bell, Leaf, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { alarmSoundService } from "@/services/alarmSounds";

interface AddAlarmDialogProps {
  pairId: string;
  userId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DAYS = [
  { key: "mon", label: "M" },
  { key: "tue", label: "T" },
  { key: "wed", label: "W" },
  { key: "thu", label: "T" },
  { key: "fri", label: "F" },
  { key: "sat", label: "S" },
  { key: "sun", label: "S" },
];

const SOUNDS = [
  { key: "gentle", label: "Gentle", icon: Moon, color: "bg-amber-100 text-amber-600", darkColor: "dark:bg-amber-900/50 dark:text-amber-400" },
  { key: "energetic", label: "Energetic", icon: Zap, color: "bg-yellow-100 text-yellow-600", darkColor: "dark:bg-yellow-900/50 dark:text-yellow-400" },
  { key: "classic", label: "Classic", icon: Bell, color: "bg-orange-100 text-orange-600", darkColor: "dark:bg-orange-900/50 dark:text-orange-400" },
  { key: "nature", label: "Nature", icon: Leaf, color: "bg-green-100 text-green-600", darkColor: "dark:bg-green-900/50 dark:text-green-400" },
];

const AddAlarmDialog = ({ pairId, userId, open: controlledOpen, onOpenChange }: AddAlarmDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [time, setTime] = useState("08:00");
  const [label, setLabel] = useState("");
  const [repeatDays, setRepeatDays] = useState<string[]>([]);
  const [sound, setSound] = useState("gentle");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [playingSound, setPlayingSound] = useState<string | null>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  // Stop sound when dialog closes
  useEffect(() => {
    if (!open) {
      alarmSoundService.stop();
      setPlayingSound(null);
    }
  }, [open]);

  const toggleDay = (day: string) => {
    setRepeatDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSoundSelect = (soundKey: string) => {
    setSound(soundKey);
    // Preview the sound when selected
    if (playingSound === soundKey) {
      alarmSoundService.stop();
      setPlayingSound(null);
    } else {
      alarmSoundService.preview(soundKey);
      setPlayingSound(soundKey);
      setTimeout(() => setPlayingSound(null), 1500);
    }
  };

  const handleAddAlarm = async () => {
    if (!time) {
      toast({
        title: "Error",
        description: "Please select a time",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("alarms").insert({
        pair_id: pairId,
        time: time,
        label: label.trim() || null,
        created_by: userId,
        repeat_days: repeatDays.length > 0 ? repeatDays : null,
        sound: sound,
      });

      if (error) throw error;

      toast({
        title: "Alarm set! 🔔",
        description: "Your partner will be reminded too",
      });
      setOpen(false);
      setTime("08:00");
      setLabel("");
      setRepeatDays([]);
      setSound("gentle");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const dialogContent = (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="text-xl">Set New Alarm</DialogTitle>
        <DialogDescription>Create an alarm that will ring for both of you</DialogDescription>
      </DialogHeader>
      
      <div className="space-y-6 py-2">
        {/* Alarm Label */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Alarm Label</Label>
          <Input
            placeholder="Wake up together! 🌅"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="h-12 text-base bg-muted/50 border-border/50"
          />
        </div>

        {/* Time Picker */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Time</Label>
          <div className="relative">
            <Input 
              type="time" 
              value={time} 
              onChange={(e) => setTime(e.target.value)}
              className="h-16 text-4xl font-bold text-center bg-muted/50 border-border/50 [&::-webkit-calendar-picker-indicator]:opacity-0"
            />
            <Clock className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Repeat Days */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Repeat Days</Label>
          <div className="flex gap-2 justify-between">
            {DAYS.map((day) => (
              <button
                key={day.key}
                type="button"
                onClick={() => toggleDay(day.key)}
                className={cn(
                  "w-10 h-10 rounded-full text-sm font-medium transition-all",
                  "border-2 hover:scale-105",
                  repeatDays.includes(day.key)
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-muted/50 text-muted-foreground border-border/50 hover:border-primary/50"
                )}
              >
                {day.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {repeatDays.length === 0 ? "One-time alarm" : `Repeats ${repeatDays.length} day${repeatDays.length > 1 ? 's' : ''}/week`}
          </p>
        </div>

        {/* Sound Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-foreground">Sound</Label>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Volume2 className="h-3 w-3" />
              Tap to preview
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {SOUNDS.map((s) => {
              const Icon = s.icon;
              const isPlaying = playingSound === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => handleSoundSelect(s.key)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl transition-all relative",
                    "border-2 hover:scale-105",
                    sound === s.key
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border/50 bg-muted/30 hover:border-primary/50"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center relative",
                    s.color,
                    s.darkColor,
                    isPlaying && "animate-pulse"
                  )}>
                    {isPlaying ? (
                      <Volume2 className="h-5 w-5 animate-pulse" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-xs font-medium">{s.label}</span>
                  {isPlaying && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-ping" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <Button 
          onClick={handleAddAlarm} 
          disabled={loading} 
          className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
        >
          {loading ? "Setting..." : "Set Alarm for Both"}
        </Button>
      </div>
    </DialogContent>
  );

  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Clock className="h-4 w-4 mr-1" />
          Alarm
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
};

export default AddAlarmDialog;
