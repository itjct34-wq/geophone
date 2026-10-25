export type InvestigationTargetType = 'domain' | 'ip' | 'phone' | 'username';
export type MonitoringRunStatus = 'ok' | 'not_found' | 'error';

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

export type Database = {
  public: {
    Tables: {
      investigation_targets: {
        Row: InvestigationTargetRow;
        Insert: InvestigationTargetInsert;
        Update: InvestigationTargetUpdate;
        Relationships: [];
      };
      monitoring_runs: {
        Row: MonitoringRunRow;
        Insert: {
          id?: string;
          target_id: string;
          user_id: string;
          status: MonitoringRunStatus;
          summary: string;
          details?: Record<string, unknown>;
          checked_at?: string;
        };
        Update: Partial<MonitoringRunRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
