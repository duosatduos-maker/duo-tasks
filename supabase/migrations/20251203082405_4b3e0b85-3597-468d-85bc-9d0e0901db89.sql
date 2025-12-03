-- Add confirmed_by column to tasks for partner confirmation
ALTER TABLE public.tasks ADD COLUMN confirmed_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.tasks ADD COLUMN confirmed_at timestamp with time zone;

-- Update RLS policy to allow partner to confirm (mark complete) tasks assigned to the other user
DROP POLICY IF EXISTS "Users can update tasks from their pairs" ON public.tasks;

CREATE POLICY "Users can update tasks from their pairs" 
ON public.tasks 
FOR UPDATE 
USING (EXISTS ( SELECT 1
   FROM pairs
  WHERE ((pairs.id = tasks.pair_id) AND ((pairs.user_id_1 = auth.uid()) OR (pairs.user_id_2 = auth.uid())) AND (pairs.status = 'accepted'::text))));
