import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Trash2, MessageCircle } from "lucide-react";
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
  assigned_to: string | null;
  due_date: string | null;
  scope: string | null;
  profiles?: {
    username: string;
  };
}

interface TaskListProps {
  pairId: string;
  currentUserId: string;
}

const TaskList = ({ pairId, currentUserId }: TaskListProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTasks();

    const channel = supabase
      .channel("tasks-changes")
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

    // Fetch usernames separately for assigned users
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

  const toggleTask = async (taskId: string, completed: boolean) => {
    const { error } = await supabase
      .from("tasks")
      .update({ completed: !completed, completed_at: !completed ? new Date().toISOString() : null })
      .eq("id", taskId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
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

  const getScopeBadgeColor = (scope: string | null) => {
    switch (scope) {
      case "tomorrow": return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      case "this_week": return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20";
      case "this_month": return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "next_month": return "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20";
      default: return "";
    }
  };

  // Separate tasks by owner
  const myTasks = tasks.filter(t => t.assigned_to === currentUserId);
  const partnerTasks = tasks.filter(t => t.assigned_to !== currentUserId);
  const partnerName = partnerTasks[0]?.profiles?.username || "Partner";

  const renderTaskCard = (task: Task) => {
    const isMyTask = task.assigned_to === currentUserId;
    return (
      <div
        key={task.id}
        className={cn(
          "flex items-start gap-3 p-4 rounded-lg border transition-all group",
          isMyTask 
            ? "bg-accent/5 border-accent/20 hover:bg-accent/10" 
            : "bg-primary/5 border-primary/20 hover:bg-primary/10"
        )}
      >
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => toggleTask(task.id, task.completed)}
          className="mt-1"
        />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn(
              "font-medium",
              task.completed && "line-through text-muted-foreground"
            )}>
              {task.title}
            </p>
            {task.scope && (
              <Badge variant="secondary" className={getScopeBadgeColor(task.scope)}>
                {task.scope.replace("_", " ")}
              </Badge>
            )}
          </div>
          {task.description && (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          )}
          {task.due_date && (
            <p className="text-xs text-muted-foreground">
              Due: {format(new Date(task.due_date), "MMM d, yyyy")}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedTask(task)}
            title="Send a nudge"
          >
            <MessageCircle className="h-4 w-4 text-primary" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => deleteTask(task.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {tasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No tasks yet. Create one to get started!</p>
        ) : (
          <>
            {/* Partner's Tasks Section */}
            {partnerTasks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-1 bg-primary rounded-full" />
                  <h3 className="font-semibold text-lg">{partnerName}'s Tasks</h3>
                  <Badge variant="secondary" className="ml-auto">
                    {partnerTasks.filter(t => !t.completed).length} active
                  </Badge>
                </div>
                <div className="space-y-2">
                  {partnerTasks.map(renderTaskCard)}
                </div>
              </div>
            )}

            {/* My Tasks Section */}
            {myTasks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-1 bg-accent rounded-full" />
                  <h3 className="font-semibold text-lg">My Tasks</h3>
                  <Badge variant="secondary" className="ml-auto">
                    {myTasks.filter(t => !t.completed).length} active
                  </Badge>
                </div>
                <div className="space-y-2">
                  {myTasks.map(renderTaskCard)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedTask && (
        <TaskDetailDialog
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          taskId={selectedTask.id}
          taskTitle={selectedTask.title}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
};

export default TaskList;
