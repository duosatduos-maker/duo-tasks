import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AddTaskDialogProps {
  pairId: string;
  userId: string;
  partnerId: string | null;
  myUsername: string;
  partnerUsername: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const AddTaskDialog = ({ pairId, userId, partnerId, myUsername, partnerUsername, open: controlledOpen, onOpenChange }: AddTaskDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState(userId);
  const [scope, setScope] = useState<string>("this_week");
  const [dueDate, setDueDate] = useState<Date>();
  const { toast } = useToast();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  useEffect(() => {
    setAssignedTo(userId);
  }, [userId]);

  const handleAddTask = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a task title",
        variant: "destructive",
      });
      return;
    }

    if (!dueDate) {
      toast({
        title: "Error",
        description: "Please select a due date",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("tasks").insert({
      pair_id: pairId,
      created_by: userId,
      assigned_to: assignedTo,
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate.toISOString(),
      scope: scope,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Task created successfully",
      });
      setTitle("");
      setDescription("");
      setDueDate(undefined);
      setAssignedTo(userId);
      setScope("this_week");
      setOpen(false);
    }
  };

  const dialogContent = (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Create New Task</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="title">Task Title</Label>
          <Input
            id="title"
            placeholder="e.g., Go to the doctor"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            placeholder="Add any additional details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="assigned">Assign to</Label>
          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger id="assigned">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={userId}>Me ({myUsername})</SelectItem>
              {partnerId && (
                <SelectItem value={partnerId}>{partnerUsername}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="scope">Time Scope</Label>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger id="scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tomorrow">Tomorrow</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="next_month">Next Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Due Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dueDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate ? format(dueDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <Button onClick={handleAddTask} className="w-full">
          Create Task
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
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
};

export default AddTaskDialog;