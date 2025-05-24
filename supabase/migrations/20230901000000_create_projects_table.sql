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

-- Create project_jobs table for mapping projects to job IDs
CREATE TABLE IF NOT EXISTS public.project_jobs (
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  PRIMARY KEY (project_id)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user','assistant')),
  content TEXT NOT NULL,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  message_type TEXT DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create canvas_objects table
CREATE TABLE IF NOT EXISTS public.canvas_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('image','text','shape')),
  x DOUBLE PRECISION NOT NULL,
  y DOUBLE PRECISION NOT NULL,
  width DOUBLE PRECISION,
  height DOUBLE PRECISION,
  rotation DOUBLE PRECISION DEFAULT 0,
  src TEXT,
  props JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_proj_time ON public.chat_messages(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_canvas_proj_updated ON public.canvas_objects(project_id, updated_at);

-- Add RLS policies
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_objects ENABLE ROW LEVEL SECURITY;

-- Create policies for projects table
CREATE POLICY select_own_projects ON public.projects
  FOR SELECT USING (user_id = 'default-user');

CREATE POLICY insert_own_projects ON public.projects
  FOR INSERT WITH CHECK (user_id = 'default-user');

-- Create policy to allow users to update their own projects
CREATE POLICY update_own_projects ON public.projects
  FOR UPDATE USING (user_id = 'default-user');

-- Create policies for project_jobs table
CREATE POLICY select_own_project_jobs ON public.project_jobs
  FOR SELECT USING (project_id IN (SELECT id FROM public.projects WHERE user_id = 'default-user'));

CREATE POLICY insert_own_project_jobs ON public.project_jobs
  FOR INSERT WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = 'default-user'));

CREATE POLICY update_own_project_jobs ON public.project_jobs
  FOR UPDATE USING (project_id IN (SELECT id FROM public.projects WHERE user_id = 'default-user'));

CREATE POLICY delete_own_project_jobs ON public.project_jobs
  FOR DELETE USING (project_id IN (SELECT id FROM public.projects WHERE user_id = 'default-user'));

-- Create policies for chat_messages table
CREATE POLICY select_own_chat_messages ON public.chat_messages
  FOR SELECT USING (project_id IN (SELECT id FROM public.projects WHERE user_id = 'default-user'));

CREATE POLICY insert_own_chat_messages ON public.chat_messages
  FOR INSERT WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = 'default-user'));

CREATE POLICY update_own_chat_messages ON public.chat_messages
  FOR UPDATE USING (project_id IN (SELECT id FROM public.projects WHERE user_id = 'default-user'));

CREATE POLICY delete_own_chat_messages ON public.chat_messages
  FOR DELETE USING (project_id IN (SELECT id FROM public.projects WHERE user_id = 'default-user'));

-- Create policies for canvas_objects table
CREATE POLICY select_own_canvas_objects ON public.canvas_objects
  FOR SELECT USING (project_id IN (SELECT id FROM public.projects WHERE user_id = 'default-user'));

CREATE POLICY insert_own_canvas_objects ON public.canvas_objects
  FOR INSERT WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = 'default-user'));

CREATE POLICY update_own_canvas_objects ON public.canvas_objects
  FOR UPDATE USING (project_id IN (SELECT id FROM public.projects WHERE user_id = 'default-user'));

CREATE POLICY delete_own_canvas_objects ON public.canvas_objects
  FOR DELETE USING (project_id IN (SELECT id FROM public.projects WHERE user_id = 'default-user'));

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
