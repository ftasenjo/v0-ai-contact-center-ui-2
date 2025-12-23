-- Step 14: Agent Builder (v2) - Visual flow definitions + versioning + run logs
-- Stores administrator-defined agent flows (nodes/edges) and supports publish + simulation.
--
-- Tables:
-- - cc_agent_flows: logical flow container (name/description/active version pointer)
-- - cc_agent_flow_versions: immutable snapshots of a flow graph (JSON)
-- - cc_agent_flow_runs: execution logs/results for simulation/debugging
--
-- Security posture:
-- - Matches other cc_* tables: service_role has full access (bypasses RLS).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) Flow container
CREATE TABLE IF NOT EXISTS cc_agent_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  active_version_id UUID NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK after table exists (avoid dependency ordering issues)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'cc_agent_flows'
      AND constraint_name = 'cc_agent_flows_active_version_id_fkey'
  ) THEN
    ALTER TABLE cc_agent_flows
      ADD CONSTRAINT cc_agent_flows_active_version_id_fkey
      FOREIGN KEY (active_version_id) REFERENCES cc_agent_flow_versions(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    -- cc_agent_flow_versions not created yet; handled below after versions table creation.
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_cc_agent_flows_status_created
ON cc_agent_flows(status, created_at DESC);

DROP TRIGGER IF EXISTS update_cc_agent_flows_updated_at ON cc_agent_flows;
CREATE TRIGGER update_cc_agent_flows_updated_at
BEFORE UPDATE ON cc_agent_flows
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2) Flow versions (immutable snapshots)
CREATE TABLE IF NOT EXISTS cc_agent_flow_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id UUID NOT NULL REFERENCES cc_agent_flows(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  label TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  graph_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ NULL,

  CONSTRAINT cc_agent_flow_versions_unique_version_per_flow UNIQUE (flow_id, version)
);

CREATE INDEX IF NOT EXISTS idx_cc_agent_flow_versions_flow_created
ON cc_agent_flow_versions(flow_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cc_agent_flow_versions_status_created
ON cc_agent_flow_versions(status, created_at DESC);

-- Now that versions exist, ensure active_version FK exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'cc_agent_flows'
      AND constraint_name = 'cc_agent_flows_active_version_id_fkey'
  ) THEN
    ALTER TABLE cc_agent_flows
      ADD CONSTRAINT cc_agent_flows_active_version_id_fkey
      FOREIGN KEY (active_version_id) REFERENCES cc_agent_flow_versions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3) Runs (simulation/debug)
CREATE TABLE IF NOT EXISTS cc_agent_flow_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id UUID NOT NULL REFERENCES cc_agent_flows(id) ON DELETE CASCADE,
  flow_version_id UUID NULL REFERENCES cc_agent_flow_versions(id) ON DELETE SET NULL,
  mode TEXT NOT NULL DEFAULT 'simulate' CHECK (mode IN ('simulate', 'live')),
  input_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  logs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  success BOOLEAN NOT NULL DEFAULT true,
  error_text TEXT,
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cc_agent_flow_runs_flow_created
ON cc_agent_flow_runs(flow_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cc_agent_flow_runs_version_created
ON cc_agent_flow_runs(flow_version_id, created_at DESC)
WHERE flow_version_id IS NOT NULL;

-- 4) RLS (service_role all access)
ALTER TABLE cc_agent_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_agent_flow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_agent_flow_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_access_agent_flows" ON cc_agent_flows;
DROP POLICY IF EXISTS "service_role_all_access_agent_flow_versions" ON cc_agent_flow_versions;
DROP POLICY IF EXISTS "service_role_all_access_agent_flow_runs" ON cc_agent_flow_runs;

CREATE POLICY "service_role_all_access_agent_flows" ON cc_agent_flows
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_access_agent_flow_versions" ON cc_agent_flow_versions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_access_agent_flow_runs" ON cc_agent_flow_runs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

