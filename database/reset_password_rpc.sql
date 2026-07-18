-- Run this script in your Supabase SQL Editor to enable default password resets using the Setup Code.
-- IMPORTANT: Replace 'YOUR_SETUP_CODE' on line 12 with your actual NEXT_PUBLIC_HOD_SETUP_CODE.

CREATE OR REPLACE FUNCTION public.reset_user_password(
  target_email TEXT,
  setup_code TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  fac_code TEXT;
  default_pass TEXT;
  hashed_password TEXT;
BEGIN
  -- 1. Verify the Institution Setup Code (replace 'YOUR_SETUP_CODE' with your actual secret)
  IF setup_code != 'YOUR_SETUP_CODE' THEN
    RETURN FALSE;
  END IF;

  -- 2. Query target user details
  SELECT role, faculty_code INTO user_role, fac_code
  FROM public.users
  WHERE email = target_email;

  -- Return false if user doesn't exist in public.users table
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- 3. Determine password default based on role
  IF user_role = 'HOD' THEN
    default_pass := 'MITS@HOD123';
  ELSE
    default_pass := 'Faculty@' || fac_code || '123';
  END IF;

  -- 4. Hash the default password using bcrypt (pgcrypto gen_salt)
  hashed_password := crypt(default_pass, gen_salt('bf', 10));

  -- 5. Update auth.users credentials directly
  UPDATE auth.users
  SET 
    encrypted_password = hashed_password,
    email_confirmed_at = NOW(),
    updated_at = NOW()
  WHERE email = target_email;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
