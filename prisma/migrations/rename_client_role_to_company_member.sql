-- Rename non-admin member role: CLIENT -> COMPANY_MEMBER
UPDATE public.users
SET role = 'COMPANY_MEMBER'
WHERE role = 'CLIENT';

UPDATE public.company_invites
SET role = 'COMPANY_MEMBER'
WHERE role = 'CLIENT';
