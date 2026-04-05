-- Ensure companies table has all required columns
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Ensure users table has access_until column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS access_until timestamptz;

-- Update existing records if subscription_status is NULL
UPDATE companies SET subscription_status = 'ACTIVE' WHERE subscription_status IS NULL;

-- Log the changes
SELECT 'Schema ensured successfully' as result;
