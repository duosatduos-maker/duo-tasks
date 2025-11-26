import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Trash2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TaskDetailDialog from "./TaskDetailDialog";
import { format } from "date-fns";

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
      .select(`
        *,
        profiles:assigned_to (
          username
        )
      `)
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

    setTasks(data || []);
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

  return (
    <>
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No tasks yet. Create one to get started!</p>
        ) : (
          tasks.map((task) => {
            const isMyTask = task.assigned_to === currentUserId;
            return (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
              >
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => toggleTask(task.id, task.completed)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                      {task.profiles?.username}'s task: {task.title}
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
          })
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
