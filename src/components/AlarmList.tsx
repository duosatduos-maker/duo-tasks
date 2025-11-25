import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Alarm {
  id: string;
  time: string;
  label: string | null;
  active: boolean;
  created_at: string;
}

interface AlarmListProps {
  pairId: string;
}

const AlarmList = ({ pairId }: AlarmListProps) => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadAlarms();

    const channel = supabase
      .channel("alarms-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "alarms",
          filter: `pair_id=eq.${pairId}`,
        },
        () => {
          loadAlarms();
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
    } else {
      setAlarms(data || []);
    }
  };

  const toggleAlarm = async (alarmId: string, active: boolean) => {
    const { error } = await supabase
      .from("alarms")
      .update({ active: !active })
      .eq("id", alarmId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteAlarm = async (alarmId: string) => {
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
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-3">
      {alarms.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No alarms set. Add one to get reminded!</p>
      ) : (
        alarms.map((alarm) => (
          <div
            key={alarm.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg">{formatTime(alarm.time)}</p>
              {alarm.label && <p className="text-sm text-muted-foreground">{alarm.label}</p>}
            </div>
            <Switch checked={alarm.active} onCheckedChange={() => toggleAlarm(alarm.id, alarm.active)} />
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => deleteAlarm(alarm.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))
      )}
    </div>
  );
};

export default AlarmList;
