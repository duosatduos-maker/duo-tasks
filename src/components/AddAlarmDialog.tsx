import { useState } from "react";
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
import { Clock } from "lucide-react";

interface AddAlarmDialogProps {
  pairId: string;
  userId: string;
}

const AddAlarmDialog = ({ pairId, userId }: AddAlarmDialogProps) => {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
      });

      if (error) throw error;

      toast({
        title: "Alarm set!",
        description: "Your partner will be reminded too",
      });
      setOpen(false);
      setTime("");
      setLabel("");
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Clock className="h-4 w-4 mr-1" />
          Alarm
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set New Alarm</DialogTitle>
          <DialogDescription>Create an alarm that will ring for both you and your partner</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Label (optional)</Label>
            <Input
              id="label"
              placeholder="Morning workout, Take medicine, etc."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <Button onClick={handleAddAlarm} disabled={loading} className="w-full bg-accent hover:bg-accent/90">
            {loading ? "Setting..." : "Set Alarm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddAlarmDialog;
