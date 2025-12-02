import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay } from "date-fns";
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

interface TaskCalendarProps {
  tasks: Task[];
  currentUserId: string;
}

const TaskCalendar = ({ tasks, currentUserId }: TaskCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => 
      task.due_date && isSameDay(new Date(task.due_date), date)
    );
  };

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];
  const myTasks = selectedDateTasks.filter(t => t.assigned_to === currentUserId);
  const partnerTasks = selectedDateTasks.filter(t => t.assigned_to !== currentUserId);

  const getScopeBadgeColor = (scope: string | null) => {
    switch (scope) {
      case "tomorrow": return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      case "this_week": return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20";
      case "this_month": return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "next_month": return "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20";
      default: return "";
    }
  };

  // Custom day renderer to show dots for days with tasks
  const modifiers = {
    hasTasks: (date: Date) => getTasksForDate(date).length > 0,
  };

  const modifiersStyles = {
    hasTasks: {
      fontWeight: 'bold',
      position: 'relative' as const,
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold mb-4">Task Calendar</h3>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className={cn("rounded-md border pointer-events-auto")}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
        />
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Select a date"}
        </h3>
        
        {selectedDateTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks scheduled for this day</p>
        ) : (
          <div className="space-y-4">
            {partnerTasks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-primary mb-2">
                  {partnerTasks[0]?.profiles?.username}'s Tasks
                </h4>
                <div className="space-y-2">
                  {partnerTasks.map(task => (
                    <div key={task.id} className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm font-medium flex-1",
                          task.completed && "line-through text-muted-foreground"
                        )}>
                          {task.title}
                        </p>
                        {task.scope && (
                          <Badge variant="secondary" className={cn("text-xs", getScopeBadgeColor(task.scope))}>
                            {task.scope.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {myTasks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-accent mb-2">My Tasks</h4>
                <div className="space-y-2">
                  {myTasks.map(task => (
                    <div key={task.id} className="p-3 rounded-lg bg-accent/5 border border-accent/10">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm font-medium flex-1",
                          task.completed && "line-through text-muted-foreground"
                        )}>
                          {task.title}
                        </p>
                        {task.scope && (
                          <Badge variant="secondary" className={cn("text-xs", getScopeBadgeColor(task.scope))}>
                            {task.scope.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default TaskCalendar;
