-- Entity-level requirement settings extend the existing requirements JSONB columns.
-- The versioned compliance_requirements table remains the granular rule catalog.

alter table public.countries
  drop constraint if exists countries_requirements_shape_check,
  add constraint countries_requirements_shape_check check (
    jsonb_typeof(requirements) = 'object'
    and (
      not (requirements ? 'requiredDocumentTypes')
      or jsonb_typeof(requirements->'requiredDocumentTypes') = 'array'
    )
    and (
      not (requirements ? 'minIeltsScore')
      or requirements->>'minIeltsScore' = ''
      or jsonb_typeof(requirements->'minIeltsScore') = 'number'
      or requirements->>'minIeltsScore' = 'null'
    )
    and (
      not (requirements ? 'minPassportValidityMonths')
      or requirements->>'minPassportValidityMonths' = ''
      or jsonb_typeof(requirements->'minPassportValidityMonths') = 'number'
      or requirements->>'minPassportValidityMonths' = 'null'
    )
    and (
      not (requirements ? 'minGpa')
      or requirements->>'minGpa' = ''
      or jsonb_typeof(requirements->'minGpa') = 'number'
      or requirements->>'minGpa' = 'null'
    )
  );

alter table public.universities
  drop constraint if exists universities_requirements_shape_check,
  add constraint universities_requirements_shape_check check (
    jsonb_typeof(requirements) = 'object'
    and (not (requirements ? 'requiredDocumentTypes') or jsonb_typeof(requirements->'requiredDocumentTypes') = 'array')
    and (not (requirements ? 'minIeltsScore') or requirements->>'minIeltsScore' = '' or jsonb_typeof(requirements->'minIeltsScore') = 'number' or requirements->>'minIeltsScore' = 'null')
    and (not (requirements ? 'minPassportValidityMonths') or requirements->>'minPassportValidityMonths' = '' or jsonb_typeof(requirements->'minPassportValidityMonths') = 'number' or requirements->>'minPassportValidityMonths' = 'null')
    and (not (requirements ? 'minGpa') or requirements->>'minGpa' = '' or jsonb_typeof(requirements->'minGpa') = 'number' or requirements->>'minGpa' = 'null')
  );

alter table public.programmes
  drop constraint if exists programmes_requirements_shape_check,
  add constraint programmes_requirements_shape_check check (
    jsonb_typeof(requirements) = 'object'
    and (not (requirements ? 'requiredDocumentTypes') or jsonb_typeof(requirements->'requiredDocumentTypes') = 'array')
    and (not (requirements ? 'minIeltsScore') or requirements->>'minIeltsScore' = '' or jsonb_typeof(requirements->'minIeltsScore') = 'number' or requirements->>'minIeltsScore' = 'null')
    and (not (requirements ? 'minPassportValidityMonths') or requirements->>'minPassportValidityMonths' = '' or jsonb_typeof(requirements->'minPassportValidityMonths') = 'number' or requirements->>'minPassportValidityMonths' = 'null')
    and (not (requirements ? 'minGpa') or requirements->>'minGpa' = '' or jsonb_typeof(requirements->'minGpa') = 'number' or requirements->>'minGpa' = 'null')
  );

create index if not exists countries_requirements_gin_idx on public.countries using gin (requirements);
create index if not exists universities_requirements_gin_idx on public.universities using gin (requirements);
create index if not exists programmes_requirements_gin_idx on public.programmes using gin (requirements);
