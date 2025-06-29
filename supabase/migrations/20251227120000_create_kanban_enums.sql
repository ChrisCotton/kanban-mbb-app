-- Migration 001: Create Kanban Board Enums
-- Run this first to create the custom types

-- Create enum for task status (swim lanes)
DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'doing', 'done');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for task priority levels  
DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$; 