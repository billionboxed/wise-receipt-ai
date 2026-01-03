-- Add is_project and is_archived columns to tags table
ALTER TABLE public.tags 
ADD COLUMN is_project boolean NOT NULL DEFAULT false,
ADD COLUMN is_archived boolean NOT NULL DEFAULT false;