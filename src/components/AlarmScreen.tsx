import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Bell, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlarmNotificationService } from "@/services/alarmNotifications";
import { Capacitor } from "@capacitor/core";

interface Alarm {
  id: string;
  time: string;
  label: string | null;
  active: boolean;
  created_at: string;
}

interface AlarmScreenProps {
  pairId: string;
}

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

    setAlarms(data || []);
    
    if (Capacitor.isNativePlatform() && data) {
      for (const alarm of data) {
        if (alarm.active) {
          await AlarmNotificationService.scheduleAlarm(alarm);
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

  const activeCount = alarms.filter(a => a.active).length;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold">Shared Alarms</h2>
        </div>
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          {activeCount} active
        </Badge>
      </div>

      {alarms.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No alarms set</p>
          <p className="text-sm text-muted-foreground/70">Tap + to create a shared alarm</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alarms.map((alarm) => {
            const { time, period } = formatTime(alarm.time);
            return (
              <div
                key={alarm.id}
                className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border group hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold tabular-nums">{time}</p>
                    <span className="text-sm text-muted-foreground">{period}</span>
                  </div>
                  {alarm.label && (
                    <p className="text-sm text-muted-foreground truncate">{alarm.label}</p>
                  )}
                </div>
                <Switch 
                  checked={alarm.active} 
                  onCheckedChange={() => toggleAlarm(alarm.id, alarm.active)}
                  className="data-[state=checked]:bg-primary"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => deleteAlarm(alarm.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlarmScreen;