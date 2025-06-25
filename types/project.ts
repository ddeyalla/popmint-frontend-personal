export interface Project {
  id: string;
  name: string;
  description: string;
  thumbnail_url: string;
  thumbnail_updated_at?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  session_id?: string;
}

export interface ProjectCreate {
  name: string;
  description: string;
  thumbnail_url?: string;
  user_id: string;
  session_id?: string;
}
