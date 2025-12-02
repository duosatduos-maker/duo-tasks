-- Drop the old foreign key constraint and recreate it to reference profiles instead of auth.users
ALTER TABLE public.task_comments
DROP CONSTRAINT IF EXISTS task_comments_user_id_fkey;

ALTER TABLE public.task_comments
ADD CONSTRAINT task_comments_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;