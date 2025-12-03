import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Flame, Trophy, Calendar } from "lucide-react";
import { format, differenceInDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface CompletedTask {
  id: string;
  title: string;
  description: string | null;
  completed_at: string;
  confirmed_at: string | null;
  confirmed_by: string | null;
  due_date: string | null;
  pair_id: string;
  assigned_to: string;
  confirmer_username?: string;
  partner_username?: string;
}

interface TaskHistoryProps {
  userId: string;
  pairIds: string[];
}

const TaskHistory = ({ userId, pairIds }: TaskHistoryProps) => {
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [streak, setStreak] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);

  useEffect(() => {
    if (pairIds.length === 0) return;
    loadCompletedTasks();
  }, [pairIds, userId]);

  const loadCompletedTasks = async () => {
    // Fetch all completed tasks assigned to current user across all pairs
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .in("pair_id", pairIds)
      .eq("assigned_to", userId)
      .eq("completed", true)
      .not("confirmed_by", "is", null)
      .order("confirmed_at", { ascending: false });

    if (error) {
      console.error("Error loading completed tasks:", error);
      return;
    }

    // Fetch confirmer profiles
    const confirmerIds = [...new Set(data?.map(t => t.confirmed_by).filter(Boolean))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", confirmerIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

    const tasksWithProfiles = (data || []).map(task => ({
      ...task,
      confirmer_username: task.confirmed_by ? profileMap.get(task.confirmed_by) : undefined,
    }));

    setCompletedTasks(tasksWithProfiles);
    setTotalCompleted(tasksWithProfiles.length);
    calculateStreak(tasksWithProfiles);
  };

  const calculateStreak = (tasks: CompletedTask[]) => {
    if (tasks.length === 0) {
      setStreak(0);
      return;
    }

    // Group tasks by confirmation date
    const tasksByDate = new Map<string, number>();
    tasks.forEach(task => {
      if (task.confirmed_at) {
        const dateKey = format(new Date(task.confirmed_at), "yyyy-MM-dd");
        tasksByDate.set(dateKey, (tasksByDate.get(dateKey) || 0) + 1);
      }
    });

    // Calculate streak from today/yesterday backwards
    let currentStreak = 0;
    const today = startOfDay(new Date());
    let checkDate = today;

    // Check if there's a task completed today or yesterday to start the streak
    const todayKey = format(today, "yyyy-MM-dd");
    const yesterdayKey = format(new Date(today.getTime() - 86400000), "yyyy-MM-dd");
    
    if (!tasksByDate.has(todayKey) && !tasksByDate.has(yesterdayKey)) {
      setStreak(0);
      return;
    }

    // If no task today, start from yesterday
    if (!tasksByDate.has(todayKey)) {
      checkDate = new Date(today.getTime() - 86400000);
    }

    // Count consecutive days
    while (true) {
      const dateKey = format(checkDate, "yyyy-MM-dd");
      if (tasksByDate.has(dateKey)) {
        currentStreak++;
        checkDate = new Date(checkDate.getTime() - 86400000);
      } else {
        break;
      }
    }

    setStreak(currentStreak);
  };

  return (
    <div className="space-y-6">
      {/* Streak & Stats Header */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Flame className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">{streak}</p>
              <p className="text-sm text-muted-foreground">Day Streak</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-3xl font-bold text-accent">{totalCompleted}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completed Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Completed Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedTasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No completed tasks yet. Complete tasks and have your partner confirm them!
            </p>
          ) : (
            <div className="space-y-3">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-4 rounded-lg bg-green-500/5 border border-green-500/20"
                >
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{task.title}</p>
                    {task.description && (
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {task.confirmed_at && (
                        <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                          <Calendar className="h-3 w-3 mr-1" />
                          {format(new Date(task.confirmed_at), "MMM d, yyyy")}
                        </Badge>
                      )}
                      {task.confirmer_username && (
                        <Badge variant="outline" className="text-xs">
                          Confirmed by @{task.confirmer_username}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskHistory;
