-- Drop legacy tables not used by current HarmoNet schema
-- These were originally introduced for a Netflix-like subscription/feature model.

begin;

  drop table if exists public.tenant_features cascade;
  drop table if exists public.tenant_residents cascade;
  drop table if exists public.audit_logs cascade;
  drop table if exists public.board_reactions cascade;
  drop table if exists public.facility_blocked_ranges cascade;
  drop table if exists public.permissions cascade;
  drop table if exists public.role_inheritances cascade;
  drop table if exists public.role_permissions cascade;

  drop type if exists public.board_reaction_type;

commit;
