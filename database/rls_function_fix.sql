-- === RLS RECURSION FUNCTION FIX ===
-- This script replaces the get_auth_user_role() and get_auth_user_dept() functions
-- with LANGUAGE plpgsql implementations to prevent PostgreSQL from inlining them
-- and causing recursive RLS violations.

CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS VARCHAR AS $$
DECLARE
  u_role VARCHAR;
BEGIN
  SELECT role INTO u_role FROM public.users WHERE id = auth.uid();
  RETURN u_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_user_dept()
RETURNS UUID AS $$
DECLARE
  dept_id UUID;
BEGIN
  SELECT department_id INTO dept_id FROM public.users WHERE id = auth.uid();
  RETURN dept_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
