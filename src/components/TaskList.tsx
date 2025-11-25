import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Task {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  created_at: string;
}

interface TaskListProps {
  pairId: string;
}

const TaskList = ({ pairId }: TaskListProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
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
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading tasks",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTasks(data || []);
    }
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

  return (
    <div className="space-y-3">
      {tasks.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No tasks yet. Create one to get started!</p>
      ) : (
        tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
          >
            <Checkbox
              checked={task.completed}
              onCheckedChange={() => toggleTask(task.id, task.completed)}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                {task.title}
              </p>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => deleteTask(task.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))
      )}
    </div>
  );
};

export default TaskList;
