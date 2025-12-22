import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Bell, Moon, Zap, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlarmNotificationService } from "@/services/alarmNotifications";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";

interface Alarm {
  id: string;
  time: string;
  label: string | null;
  active: boolean;
  created_at: string;
  repeat_days: string[] | null;
  sound: string | null;
}

interface AlarmScreenProps {
  pairId: string;
}

const DAYS_MAP: Record<string, string> = {
  mon: "M",
  tue: "T",
  wed: "W",
  thu: "T",
  fri: "F",
  sat: "S",
  sun: "S",
};

const DAYS_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const SOUND_ICONS: Record<string, typeof Moon> = {
  gentle: Moon,
  energetic: Zap,
  classic: Bell,
  nature: Leaf,
};

const SOUND_COLORS: Record<string, string> = {
  gentle: "bg-amber-100 text-amber-600",
  energetic: "bg-yellow-100 text-yellow-600",
  classic: "bg-orange-100 text-orange-600",
  nature: "bg-green-100 text-green-600",
};

const AlarmScreen = ({ pairId }: AlarmScreenProps) => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadAlarms();

    if (Capacitor.isNativePlatform()) {
      AlarmNotificationService.requestPermissions();
    }

    const channel = supabase
      .channel("alarms-screen-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "alarms",
          filter: `pair_id=eq.${pairId}`,
        },
        async (payload) => {
          await loadAlarms();
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const alarm = payload.new as Alarm;
            await AlarmNotificationService.updateAlarm(alarm);
          } else if (payload.eventType === 'DELETE') {
            const alarm = payload.old as Alarm;
            await AlarmNotificationService.cancelAlarm(alarm.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pairId]);

  const loadAlarms = async () => {
    const { data, error } = await supabase
      .from("alarms")
      .select("*")
      .eq("pair_id", pairId)
      .order("time", { ascending: true });

    if (error) {
      toast({
        title: "Error loading alarms",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Cast to include new columns (repeat_days, sound) that may not be in generated types yet
    const alarmsData = (data || []) as unknown as Alarm[];
    setAlarms(alarmsData);
    
    if (Capacitor.isNativePlatform() && alarmsData) {
      for (const alarm of alarmsData) {
        if (alarm.active) {
          await AlarmNotificationService.scheduleAlarm(alarm as any);
        }
      }
    }
  };

  const toggleAlarm = async (alarmId: string, active: boolean) => {
    const { error, data } = await supabase
      .from("alarms")
      .update({ active: !active })
      .eq("id", alarmId)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (data) {
      await AlarmNotificationService.updateAlarm(data);
    }
  };

  const deleteAlarm = async (alarmId: string) => {
    await AlarmNotificationService.cancelAlarm(alarmId);
    const { error } = await supabase.from("alarms").delete().eq("id", alarmId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return { time: `${displayHour}:${minutes}`, period: ampm };
  };

  const getRepeatLabel = (repeatDays: string[] | null) => {
    if (!repeatDays || repeatDays.length === 0) return "One-time";
    if (repeatDays.length === 7) return "Every day";
    if (repeatDays.length === 5 && 
        repeatDays.includes("mon") && 
        repeatDays.includes("tue") && 
        repeatDays.includes("wed") && 
        repeatDays.includes("thu") && 
        repeatDays.includes("fri")) {
      return "Weekdays";
    }
    if (repeatDays.length === 2 && 
        repeatDays.includes("sat") && 
        repeatDays.includes("sun")) {
      return "Weekends";
    }
    return repeatDays.map(d => DAYS_MAP[d]).join(" ");
  };

  const activeCount = alarms.filter(a => a.active).length;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Shared Alarms</h2>
            <p className="text-xs text-muted-foreground">Ring on both devices</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
          {activeCount} active
        </Badge>
      </div>

      {alarms.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
            <Bell className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">No alarms set</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Tap + to create a shared alarm</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alarms.map((alarm) => {
            const { time, period } = formatTime(alarm.time);
            const SoundIcon = SOUND_ICONS[alarm.sound || "classic"] || Bell;
            const soundColor = SOUND_COLORS[alarm.sound || "classic"] || "bg-orange-100 text-orange-600";
            
            return (
              <div
                key={alarm.id}
                className={cn(
                  "p-4 rounded-2xl border transition-all group",
                  alarm.active 
                    ? "bg-card border-border shadow-sm" 
                    : "bg-muted/30 border-transparent opacity-60"
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Sound Icon */}
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                    alarm.active ? soundColor : "bg-muted text-muted-foreground"
                  )}>
                    <SoundIcon className="h-6 w-6" />
                  </div>

                  {/* Time & Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1">
                      <span className={cn(
                        "text-3xl font-bold tabular-nums tracking-tight",
                        !alarm.active && "text-muted-foreground"
                      )}>
                        {time}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground ml-1">
                        {period}
                      </span>
                    </div>
                    
                    {alarm.label && (
                      <p className={cn(
                        "text-sm mt-0.5 truncate",
                        alarm.active ? "text-foreground/80" : "text-muted-foreground"
                      )}>
                        {alarm.label}
                      </p>
                    )}

                    {/* Repeat Days */}
                    <div className="flex items-center gap-2 mt-2">
                      {alarm.repeat_days && alarm.repeat_days.length > 0 ? (
                        <div className="flex gap-1">
                          {DAYS_ORDER.map((day) => (
                            <span
                              key={day}
                              className={cn(
                                "w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center",
                                alarm.repeat_days?.includes(day)
                                  ? "bg-primary/20 text-primary"
                                  : "bg-muted text-muted-foreground/50"
                              )}
                            >
                              {DAYS_MAP[day]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                          One-time alarm
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={alarm.active} 
                      onCheckedChange={() => toggleAlarm(alarm.id, alarm.active)}
                      className="data-[state=checked]:bg-primary"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteAlarm(alarm.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlarmScreen;
