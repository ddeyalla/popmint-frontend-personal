-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  user_id TEXT NOT NULL,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add RLS policies
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to select their own projects
CREATE POLICY select_own_projects ON public.projects
  FOR SELECT USING (user_id = 'default-user');

-- Create policy to allow users to insert their own projects
CREATE POLICY insert_own_projects ON public.projects
  FOR INSERT WITH CHECK (user_id = 'default-user');

-- Create policy to allow users to update their own projects
CREATE POLICY update_own_projects ON public.projects
  FOR UPDATE USING (user_id = 'default-user');

-- Create policy to allow users to delete their own projects
CREATE POLICY delete_own_projects ON public.projects
  FOR DELETE USING (user_id = 'default-user');

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update the updated_at timestamp
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON public.projects (user_id);

-- Create index on session_id for faster queries
CREATE INDEX IF NOT EXISTS projects_session_id_idx ON public.projects (session_id);
