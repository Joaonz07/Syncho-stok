-- Migration: Add DEV role to user_role enum
-- This script safely adds the DEV role if it doesn't already exist

DO $$
BEGIN
  -- Create a new enum type with all values
  CREATE TYPE user_role_new AS ENUM ('ADMIN', 'DEV', 'CLIENT');
  
  -- Alter the column to use the new type
  ALTER TABLE users 
    ALTER COLUMN role TYPE user_role_new 
    USING role::text::user_role_new;
  
  -- Drop the old type
  DROP TYPE user_role;
  
  -- Rename the new type
  ALTER TYPE user_role_new RENAME TO user_role;
  
  RAISE NOTICE 'User role enum updated successfully with DEV role';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating user role enum: %', SQLERRM;
END $$;
