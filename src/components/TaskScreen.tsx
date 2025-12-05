import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Calendar, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TaskDetailDialog from "./TaskDetailDialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  created_at: string;
  created_by: string;
  assigned_to: string | null;
  due_date: string | null;
  scope: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
}

interface TaskScreenProps {
  pairId: string;
  currentUserId: string;
  partnerName: string;
}

const TaskScreen = ({ pairId, currentUserId, partnerName }: TaskScreenProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTasks();

    const channel = supabase
      .channel("tasks-screen-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `pair_id=eq.${pairId}`,
        },
        () => {
          loadTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pairId]);

  const loadTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("pair_id", pairId)
      .order("due_date", { ascending: true });

    if (error) {
      toast({
        title: "Error loading tasks",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const userIds = [...new Set(data?.map(t => t.assigned_to).filter(Boolean))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    const tasksWithProfiles = (data || []).map(task => ({
      ...task,
      profiles: task.assigned_to ? profileMap.get(task.assigned_to) : null
    }));

    setTasks(tasksWithProfiles as any);
  };

  const confirmTask = async (task: Task) => {
    // Only partner can confirm tasks - not the task creator
    if (task.created_by === currentUserId) {
      toast({
        title: "Cannot confirm own task",
        description: "Your partner needs to confirm this task",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .update({ 
        completed: true, 
        completed_at: new Date().toISOString(),
        confirmed_by: currentUserId,
        confirmed_at: new Date().toISOString()
      })
      .eq("id", task.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Task confirmed!",
        description: `You confirmed "${task.title}" as complete`,
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getScopeBadge = (scope: string | null) => {
    switch (scope) {
      case "tomorrow": return { color: "bg-destructive/10 text-destructive", label: "high" };
      case "this_week": return { color: "bg-orange-500/10 text-orange-500", label: "medium" };
      case "this_month": return { color: "bg-primary/10 text-primary", label: "normal" };
      default: return null;
    }
  };

  // Tasks are grouped by who CREATED them (the accountable person)
  const activeTasks = tasks.filter(t => !t.confirmed_by);
  const myTasks = activeTasks.filter(t => t.created_by === currentUserId);
  const partnerTasks = activeTasks.filter(t => t.created_by !== currentUserId);

  const renderTask = (task: Task) => {
    const isMyTask = task.created_by === currentUserId;
    const scopeBadge = getScopeBadge(task.scope);

    return (
      <div
        key={task.id}
        className="flex items-start gap-3 p-4 bg-card rounded-xl border border-border group hover:shadow-md transition-shadow"
      >
        {!isMyTask ? (
          <Checkbox
            checked={task.completed}
            onCheckedChange={() => confirmTask(task)}
            className="mt-1 h-5 w-5 rounded-md border-2 border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
        ) : (
          <div className="w-5 h-5 rounded-md border-2 border-muted-foreground/20 mt-1" />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {scopeBadge && (
              <Badge variant="secondary" className={cn("text-xs px-2 py-0", scopeBadge.color)}>
                <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                {scopeBadge.label}
              </Badge>
            )}
          </div>
          <p className={cn(
            "font-medium text-foreground",
            task.completed && "line-through text-muted-foreground"
          )}>
            {task.title}
          </p>
          {task.due_date && (
            <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs">{format(new Date(task.due_date), "MMM d")}</span>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={() => deleteTask(task.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListFilter className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold">Shared Tasks</h2>
        </div>
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          {activeTasks.length} active
        </Badge>
      </div>

      {activeTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <ListFilter className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No tasks yet</p>
          <p className="text-sm text-muted-foreground/70">Tap + to create your first task</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* My Tasks First - Tasks I created that I'm accountable for */}
          {myTasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground px-1">
                My Tasks ({myTasks.length})
              </p>
              {myTasks.map(renderTask)}
            </div>
          )}

          {/* Partner's Tasks - Tasks they created that I can confirm */}
          {partnerTasks.length > 0 && (
            <div className="space-y-2 mt-6">
              <p className="text-sm font-medium text-muted-foreground px-1">
                {partnerName}'s Tasks ({partnerTasks.length})
              </p>
              {partnerTasks.map(renderTask)}
            </div>
          )}
        </div>
      )}

      {selectedTask && (
        <TaskDetailDialog
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          taskId={selectedTask.id}
          taskTitle={selectedTask.title}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
};

export default TaskScreen;