-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies: users can view all profiles but only update their own
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create pairs table for user partnerships
CREATE TABLE public.pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id_1, user_id_2),
  CHECK (user_id_1 < user_id_2)
);

-- Enable RLS on pairs
ALTER TABLE public.pairs ENABLE ROW LEVEL SECURITY;

-- Pairs policies: users can only see pairs they're part of
CREATE POLICY "Users can view their pairs"
  ON public.pairs FOR SELECT
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "Users can create pairs"
  ON public.pairs FOR INSERT
  WITH CHECK (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "Users can update their pairs"
  ON public.pairs FOR UPDATE
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Create tasks table for shared tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID NOT NULL REFERENCES public.pairs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT false NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Tasks policies: users can manage tasks for their pairs
CREATE POLICY "Users can view tasks from their pairs"
  ON public.tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pairs
      WHERE pairs.id = tasks.pair_id
      AND (pairs.user_id_1 = auth.uid() OR pairs.user_id_2 = auth.uid())
      AND pairs.status = 'accepted'
    )
  );

CREATE POLICY "Users can create tasks for their pairs"
  ON public.tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pairs
      WHERE pairs.id = pair_id
      AND (pairs.user_id_1 = auth.uid() OR pairs.user_id_2 = auth.uid())
      AND pairs.status = 'accepted'
    )
  );

CREATE POLICY "Users can update tasks from their pairs"
  ON public.tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.pairs
      WHERE pairs.id = tasks.pair_id
      AND (pairs.user_id_1 = auth.uid() OR pairs.user_id_2 = auth.uid())
      AND pairs.status = 'accepted'
    )
  );

CREATE POLICY "Users can delete tasks from their pairs"
  ON public.tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.pairs
      WHERE pairs.id = tasks.pair_id
      AND (pairs.user_id_1 = auth.uid() OR pairs.user_id_2 = auth.uid())
      AND pairs.status = 'accepted'
    )
  );

-- Create alarms table for shared alarms
CREATE TABLE public.alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID NOT NULL REFERENCES public.pairs(id) ON DELETE CASCADE,
  time TIME NOT NULL,
  label TEXT,
  active BOOLEAN DEFAULT true NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on alarms
ALTER TABLE public.alarms ENABLE ROW LEVEL SECURITY;

-- Alarms policies: users can manage alarms for their pairs
CREATE POLICY "Users can view alarms from their pairs"
  ON public.alarms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pairs
      WHERE pairs.id = alarms.pair_id
      AND (pairs.user_id_1 = auth.uid() OR pairs.user_id_2 = auth.uid())
      AND pairs.status = 'accepted'
    )
  );

CREATE POLICY "Users can create alarms for their pairs"
  ON public.alarms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pairs
      WHERE pairs.id = pair_id
      AND (pairs.user_id_1 = auth.uid() OR pairs.user_id_2 = auth.uid())
      AND pairs.status = 'accepted'
    )
  );

CREATE POLICY "Users can update alarms from their pairs"
  ON public.alarms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.pairs
      WHERE pairs.id = alarms.pair_id
      AND (pairs.user_id_1 = auth.uid() OR pairs.user_id_2 = auth.uid())
      AND pairs.status = 'accepted'
    )
  );

CREATE POLICY "Users can delete alarms from their pairs"
  ON public.alarms FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.pairs
      WHERE pairs.id = alarms.pair_id
      AND (pairs.user_id_1 = auth.uid() OR pairs.user_id_2 = auth.uid())
      AND pairs.status = 'accepted'
    )
  );

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alarms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pairs;

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)));
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();