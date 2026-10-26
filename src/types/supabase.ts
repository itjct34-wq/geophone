export type InvestigationTargetType = 'domain' | 'ip' | 'phone' | 'username';
export type MonitoringRunStatus = 'ok' | 'not_found' | 'error';
export type ProfileRole = 'admin' | 'customer';
export type ProfilePlan = 'free' | 'paid';
export type ApiKeyPlan = 'free' | 'pro' | 'business';
export type DesignSurfaceMode = 'persuade' | 'operate' | 'read' | 'experience';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type InvestigationTargetRow = {
  id: string;
  user_id: string;
  label: string;
  target_type: InvestigationTargetType;
  target_value: string;
  monitor_enabled: boolean;
  frequency_minutes: number | null;
  next_run_at: string | null;
  last_run_at: string | null;
  last_status: string | null;
  created_at: string;
  updated_at: string;
};

export type InvestigationTargetInsert = {
  id?: string;
  user_id: string;
  label: string;
  target_type: InvestigationTargetType;
  target_value: string;
  monitor_enabled?: boolean;
  frequency_minutes?: number | null;
  next_run_at?: string | null;
  last_run_at?: string | null;
  last_status?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type InvestigationTargetUpdate = Partial<InvestigationTargetInsert>;

export type MonitoringRunRow = {
  id: string;
  target_id: string;
  user_id: string;
  status: MonitoringRunStatus;
  summary: string;
  details: Record<string, unknown>;
  checked_at: string;
};

type ProfilesRow = {
  user_id: string;
  role: ProfileRole;
  plan: ProfilePlan;
  paid_until: string | null;
  disabled: boolean;
  terms_version: string | null;
  terms_agreed_at: string | null;
  daily_link_limit: number;
  created_at: string;
};

type UpgradeRequestsRow = {
  id: string;
  user_id: string;
  status: 'pending' | 'done';
  note: string;
  payment_link: string | null;
  price_note: string;
  paid_claimed_at: string | null;
  created_at: string;
};

type LookupHistoryRow = {
  id: string;
  user_id: string;
  raw_input: string;
  e164: string | null;
  carrier: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

type BatchListsRow = {
  id: string;
  user_id: string;
  name: string;
  numbers: string[];
  updated_at: string;
  created_at: string;
};

type ShareSessionsRow = {
  id: string;
  user_id: string;
  token: string;
  label: string;
  requested_by: string;
  phone_e164: string | null;
  created_at: string;
  expires_at: string;
  ended_at: string | null;
  started_at: string | null;
  last_lat: number | null;
  last_lng: number | null;
  last_accuracy: number | null;
  last_at: string | null;
  shared_info: Json | null;
};

type LinkReportsRow = {
  id: string;
  share_id: string | null;
  owner_user_id: string | null;
  email: string | null;
  phone_e164: string | null;
  reason: string;
  blocked: boolean;
  resolved: boolean;
  created_at: string;
};

type BlockedNumbersRow = {
  phone_e164: string;
  reason: string;
  created_at: string;
};

type DesignSettingsRow = {
  id: string;
  brand_name: string;
  tagline: string;
  primary_color: string;
  accent_color: string;
  surface_mode: DesignSurfaceMode;
  notes: string;
  updated_at: string;
  updated_by: string | null;
};

type AiSettingsRow = {
  id: string;
  groq_api_key: string;
  groq_model: string;
  ollama_base_url: string;
  ollama_model: string;
  updated_at: string;
  updated_by: string | null;
};

export type AiSettingsPublic = {
  groqConfigured: boolean;
  groqKeyMasked: string | null;
  groqModel: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  updatedAt?: string;
};

type ApiKeysRow = {
  id: string;
  user_id: string | null;
  name: string;
  key_prefix: string;
  key_hash: string;
  plan: ApiKeyPlan;
  monthly_limit: number;
  disabled: boolean;
  created_at: string;
  last_used_at: string | null;
};

type ApiKeyUsageRow = {
  key_id: string;
  period_yyyy_mm: string;
  request_count: number;
};

type PermissionLabCampaignsRow = {
  id: string;
  owner_id: string;
  token: string;
  label: string;
  created_at: string;
  expires_at: string;
  ended_at: string | null;
};

type PermissionLabEventsRow = {
  id: string;
  campaign_id: string;
  created_at: string;
  read_at: string | null;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  client_ip: string | null;
  user_agent: string | null;
  payload: Json;
};

type OsintCacheRow = {
  cache_key: string;
  provider: string;
  target_hash: string;
  response: Json;
  created_at: string;
  expires_at: string;
};

type CampaignLinksRow = {
  id: string;
  user_id: string;
  code: string;
  label: string | null;
  created_at: string;
  expires_at: string | null;
  [key: string]: Json | undefined;
};

type TableDef<Row, Insert = Partial<Row> & Record<string, unknown>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      investigation_targets: TableDef<InvestigationTargetRow, InvestigationTargetInsert, InvestigationTargetUpdate>;
      monitoring_runs: TableDef<
        MonitoringRunRow,
        {
          id?: string;
          target_id: string;
          user_id: string;
          status: MonitoringRunStatus;
          summary: string;
          details?: Record<string, unknown>;
          checked_at?: string;
        },
        Partial<MonitoringRunRow>
      >;
      profiles: TableDef<ProfilesRow, Partial<ProfilesRow> & { user_id: string }>;
      upgrade_requests: TableDef<UpgradeRequestsRow, Partial<UpgradeRequestsRow> & { note?: string }>;
      lookup_history: TableDef<
        LookupHistoryRow,
        {
          id?: string;
          user_id?: string;
          raw_input: string;
          e164?: string | null;
          carrier?: string | null;
          region?: string | null;
          lat?: number | null;
          lng?: number | null;
          created_at?: string;
        }
      >;
      batch_lists: TableDef<
        BatchListsRow,
        { id?: string; user_id?: string; name: string; numbers?: string[]; updated_at?: string; created_at?: string }
      >;
      share_sessions: TableDef<
        ShareSessionsRow,
        {
          id?: string;
          user_id?: string;
          token?: string;
          label?: string;
          requested_by?: string;
          phone_e164?: string | null;
          created_at?: string;
          expires_at?: string;
          ended_at?: string | null;
          started_at?: string | null;
          last_lat?: number | null;
          last_lng?: number | null;
          last_accuracy?: number | null;
          last_at?: string | null;
          shared_info?: Json | null;
        }
      >;
      link_reports: TableDef<LinkReportsRow>;
      blocked_numbers: TableDef<BlockedNumbersRow, { phone_e164: string; reason?: string; created_at?: string }>;
      design_settings: TableDef<DesignSettingsRow>;
      ai_settings: TableDef<AiSettingsRow>;
      api_keys: TableDef<ApiKeysRow>;
      api_key_usage: TableDef<ApiKeyUsageRow>;
      permission_lab_campaigns: TableDef<
        PermissionLabCampaignsRow,
        {
          id?: string;
          owner_id: string;
          token: string;
          label?: string;
          created_at?: string;
          expires_at?: string;
          ended_at?: string | null;
        }
      >;
      permission_lab_events: TableDef<
        PermissionLabEventsRow,
        Partial<PermissionLabEventsRow> & { campaign_id: string; payload?: Json },
        Partial<PermissionLabEventsRow>
      >;
      osint_cache: TableDef<OsintCacheRow>;
      campaign_links: TableDef<CampaignLinksRow>;
    };
    Views: Record<string, never>;
    Functions: {
      accept_terms: { Args: { p_version: string }; Returns: undefined };
      claim_paid: { Args: Record<string, never>; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      has_paid_access: { Args: Record<string, never>; Returns: boolean };
      current_terms_version: { Args: Record<string, never>; Returns: string };
      admin_list_customers: { Args: Record<string, never>; Returns: unknown };
      admin_set_access: {
        Args: { p_user: string; p_plan: ProfilePlan; p_days: number; p_disabled: boolean };
        Returns: undefined;
      };
      admin_set_payment_link: { Args: { p_user: string; p_link: string; p_price: string }; Returns: undefined };
      admin_list_reports: { Args: Record<string, never>; Returns: unknown };
      admin_resolve_report: { Args: { p_id: string }; Returns: undefined };
      admin_get_design_settings: { Args: Record<string, never>; Returns: DesignSettingsRow };
      admin_set_design_settings: {
        Args: {
          p_brand_name: string;
          p_tagline: string;
          p_primary_color: string;
          p_accent_color: string;
          p_surface_mode: DesignSurfaceMode;
          p_notes: string;
        };
        Returns: DesignSettingsRow;
      };
      admin_get_ai_settings: { Args: Record<string, never>; Returns: AiSettingsPublic };
      admin_set_ai_settings: {
        Args: {
          p_groq_api_key?: string | null;
          p_groq_model?: string | null;
          p_ollama_base_url?: string | null;
          p_ollama_model?: string | null;
          p_clear_groq_key?: boolean;
        };
        Returns: AiSettingsPublic;
      };
      admin_list_api_keys: { Args: Record<string, never>; Returns: unknown };
      admin_create_api_key: {
        Args: { p_name: string; p_plan: ApiKeyPlan; p_user: string | null };
        Returns: unknown;
      };
      admin_set_api_key_disabled: { Args: { p_id: string; p_disabled: boolean }; Returns: undefined };
      share_info: { Args: { p_token: string }; Returns: unknown };
      share_post: {
        Args: { p_token: string; p_lat: number; p_lng: number; p_accuracy: number };
        Returns: boolean;
      };
      share_stop: { Args: { p_token: string }; Returns: undefined };
      share_set_info: { Args: { p_token: string; p_info: Json | Record<string, unknown> }; Returns: boolean };
      report_link: { Args: { p_token: string; p_block: boolean; p_reason: string }; Returns: undefined };
      permission_lab_info: { Args: { p_token: string }; Returns: unknown };
      permission_lab_submit: {
        Args: { p_token: string; p_payload: Json | Record<string, unknown> };
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
