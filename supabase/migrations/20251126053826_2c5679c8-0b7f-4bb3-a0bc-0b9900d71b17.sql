-- Add task ownership and time scoping columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN due_date timestamp with time zone,
ADD COLUMN scope text CHECK (scope IN ('tomorrow', 'this_week', 'this_month', 'next_month'));

-- Create task_comments table for nudging/accountability messages
CREATE TABLE public.task_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on task_comments
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on tasks from their pairs
CREATE POLICY "Users can view comments on their pair tasks"
ON public.task_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    JOIN public.pairs ON tasks.pair_id = pairs.id
    WHERE tasks.id = task_comments.task_id
      AND (pairs.user_id_1 = auth.uid() OR pairs.user_id_2 = auth.uid())
      AND pairs.status = 'accepted'
  )
);

-- Users can create comments on tasks from their pairs
CREATE POLICY "Users can create comments on their pair tasks"
ON public.task_comments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks
    JOIN public.pairs ON tasks.pair_id = pairs.id
    WHERE tasks.id = task_comments.task_id
      AND (pairs.user_id_1 = auth.uid() OR pairs.user_id_2 = auth.uid())
      AND pairs.status = 'accepted'
  )
);

-- Create index for better performance
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);