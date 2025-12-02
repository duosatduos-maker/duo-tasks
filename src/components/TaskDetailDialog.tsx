import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send } from "lucide-react";
import { format } from "date-fns";

interface TaskComment {
  id: string;
  message: string;
  created_at: string;
  user_id: string;
  profiles?: {
    username: string;
  };
}

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  currentUserId: string;
}

const TaskDetailDialog = ({ open, onOpenChange, taskId, taskTitle, currentUserId }: TaskDetailDialogProps) => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadComments();

      const channel = supabase
        .channel(`task-comments-${taskId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "task_comments",
            filter: `task_id=eq.${taskId}`,
          },
          () => {
            loadComments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, taskId]);

  const loadComments = async () => {
    const { data, error } = await supabase
      .from("task_comments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        title: "Error loading comments",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Fetch usernames separately
    const userIds = [...new Set(data?.map(c => c.user_id).filter(Boolean))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    const commentsWithProfiles = (data || []).map(comment => ({
      ...comment,
      profiles: profileMap.get(comment.user_id)
    }));

    setComments(commentsWithProfiles as any);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const { error } = await supabase.from("task_comments").insert({
      task_id: taskId,
      user_id: currentUserId,
      message: newMessage.trim(),
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setNewMessage("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{taskTitle}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-3 py-4">
          {comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No messages yet. Send a nudge to help with accountability!
            </p>
          ) : (
            comments.map((comment) => {
              const isOwnMessage = comment.user_id === currentUserId;
              return (
                <div
                  key={comment.id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      isOwnMessage
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-xs font-semibold mb-1">
                      {comment.profiles?.username || "Unknown"}
                    </p>
                    <p className="text-sm">{comment.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {format(new Date(comment.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Textarea
            placeholder="Send a nudge or check-in message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            rows={2}
            className="flex-1"
          />
          <Button onClick={sendMessage} size="icon" className="self-end">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;
