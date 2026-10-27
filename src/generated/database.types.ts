// Generated from the executed migrations by scripts/generate-database-types.mjs.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
export type Database = {
  public: {
    Tables: {
      ai_drafts: {
        Row: {
          id: string;
          workspace_id: string;
          event_id: string;
          base_version: number;
          model_id: string;
          prompt_version: string;
          schema_version: number;
          payload: Json;
          status: string;
          created_by: string;
          expires_at: string;
          created_at: string;
          updated_at: string;
          provider_id: string | null;
          requested_model_id: string | null;
          actual_model_id: string | null;
          provider_request_id: string | null;
          fallback_occurred: boolean;
          latency_ms: number | null;
          attempt_count: number | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          event_id: string;
          base_version: number;
          model_id: string;
          prompt_version?: string;
          schema_version?: number;
          payload: Json;
          status?: string;
          created_by: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
          provider_id?: string | null;
          requested_model_id?: string | null;
          actual_model_id?: string | null;
          provider_request_id?: string | null;
          fallback_occurred?: boolean;
          latency_ms?: number | null;
          attempt_count?: number | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          event_id?: string;
          base_version?: number;
          model_id?: string;
          prompt_version?: string;
          schema_version?: number;
          payload?: Json;
          status?: string;
          created_by?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
          provider_id?: string | null;
          requested_model_id?: string | null;
          actual_model_id?: string | null;
          provider_request_id?: string | null;
          fallback_occurred?: boolean;
          latency_ms?: number | null;
          attempt_count?: number | null;
        };
        Relationships: [];
      };
      ai_usage_records: {
        Row: {
          id: string;
          workspace_id: string;
          actor_id: string;
          event_id: string;
          model_id: string;
          operation: string;
          input_tokens: number | null;
          output_tokens: number | null;
          status: string;
          estimated_cost_minor: number | null;
          created_at: string;
          provider_id: string | null;
          requested_model_id: string | null;
          actual_model_id: string | null;
          provider_request_id: string | null;
          fallback_occurred: boolean;
          latency_ms: number | null;
          attempt_count: number | null;
          error_code: string | null;
          usage_metadata: Json;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          actor_id: string;
          event_id: string;
          model_id: string;
          operation: string;
          input_tokens?: number | null;
          output_tokens?: number | null;
          status: string;
          estimated_cost_minor?: number | null;
          created_at?: string;
          provider_id?: string | null;
          requested_model_id?: string | null;
          actual_model_id?: string | null;
          provider_request_id?: string | null;
          fallback_occurred?: boolean;
          latency_ms?: number | null;
          attempt_count?: number | null;
          error_code?: string | null;
          usage_metadata?: Json;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          actor_id?: string;
          event_id?: string;
          model_id?: string;
          operation?: string;
          input_tokens?: number | null;
          output_tokens?: number | null;
          status?: string;
          estimated_cost_minor?: number | null;
          created_at?: string;
          provider_id?: string | null;
          requested_model_id?: string | null;
          actual_model_id?: string | null;
          provider_request_id?: string | null;
          fallback_occurred?: boolean;
          latency_ms?: number | null;
          attempt_count?: number | null;
          error_code?: string | null;
          usage_metadata?: Json;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          id: string;
          workspace_id: string;
          event_id: string;
          actor_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          safe_diff: Json;
          request_id: string;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          event_id: string;
          actor_id?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          safe_diff: Json;
          request_id: string;
          occurred_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          event_id?: string;
          actor_id?: string | null;
          action?: string;
          resource_type?: string;
          resource_id?: string | null;
          safe_diff?: Json;
          request_id?: string;
          occurred_at?: string;
        };
        Relationships: [];
      };
      budget_items: {
        Row: {
          id: string;
          workspace_id: string;
          event_id: string;
          title: string;
          category: string;
          pricing_basis: string;
          unit_price_minor: number;
          manual_quantity: number | null;
          source_kind: string;
          source_label: string | null;
          is_locked: boolean;
          state: string;
          created_at: string;
          updated_at: string;
          event_function_id: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          event_id: string;
          title: string;
          category: string;
          pricing_basis: string;
          unit_price_minor: number;
          manual_quantity?: number | null;
          source_kind: string;
          source_label?: string | null;
          is_locked?: boolean;
          state?: string;
          created_at?: string;
          updated_at?: string;
          event_function_id?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          event_id?: string;
          title?: string;
          category?: string;
          pricing_basis?: string;
          unit_price_minor?: number;
          manual_quantity?: number | null;
          source_kind?: string;
          source_label?: string | null;
          is_locked?: boolean;
          state?: string;
          created_at?: string;
          updated_at?: string;
          event_function_id?: string | null;
        };
        Relationships: [];
      };
      event_functions: {
        Row: {
          id: string;
          workspace_id: string;
          event_id: string;
          title: string;
          starts_at: string | null;
          ends_at: string | null;
          time_zone: string;
          status: string;
          notes: string;
          state: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          event_id: string;
          title: string;
          starts_at?: string | null;
          ends_at?: string | null;
          time_zone: string;
          status?: string;
          notes?: string;
          state?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          event_id?: string;
          title?: string;
          starts_at?: string | null;
          ends_at?: string | null;
          time_zone?: string;
          status?: string;
          notes?: string;
          state?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          workspace_id: string;
          type: string;
          title: string;
          date_status: string;
          starts_at: string | null;
          time_zone: string;
          guest_count: number;
          currency: string;
          budget_minor: number;
          preferences: string;
          version: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          type: string;
          title: string;
          date_status: string;
          starts_at?: string | null;
          time_zone: string;
          guest_count: number;
          currency?: string;
          budget_minor: number;
          preferences?: string;
          version?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          type?: string;
          title?: string;
          date_status?: string;
          starts_at?: string | null;
          time_zone?: string;
          guest_count?: number;
          currency?: string;
          budget_minor?: number;
          preferences?: string;
          version?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      idempotency_receipts: {
        Row: {
          id: string;
          workspace_id: string;
          actor_id: string;
          operation: string;
          key: string;
          request_hash: string;
          response_ref: Json;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          actor_id: string;
          operation: string;
          key: string;
          request_hash: string;
          response_ref: Json;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          actor_id?: string;
          operation?: string;
          key?: string;
          request_hash?: string;
          response_ref?: Json;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      replan_proposals: {
        Row: {
          id: string;
          workspace_id: string;
          event_id: string;
          base_version: number;
          proposed_change: Json;
          typed_operations: Json;
          warnings: Json;
          calculated_effects: Json;
          status: string;
          created_by: string;
          approved_by: string | null;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          event_id: string;
          base_version: number;
          proposed_change: Json;
          typed_operations: Json;
          warnings: Json;
          calculated_effects: Json;
          status?: string;
          created_by: string;
          approved_by?: string | null;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          event_id?: string;
          base_version?: number;
          proposed_change?: Json;
          typed_operations?: Json;
          warnings?: Json;
          calculated_effects?: Json;
          status?: string;
          created_by?: string;
          approved_by?: string | null;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_dependencies: {
        Row: {
          workspace_id: string;
          event_id: string;
          task_id: string;
          depends_on_task_id: string;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          event_id: string;
          task_id: string;
          depends_on_task_id: string;
          created_at?: string;
        };
        Update: {
          workspace_id?: string;
          event_id?: string;
          task_id?: string;
          depends_on_task_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          workspace_id: string;
          event_id: string;
          title: string;
          description: string | null;
          status: string;
          due_at: string | null;
          priority: string;
          is_locked: boolean;
          created_at: string;
          updated_at: string;
          event_function_id: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          event_id: string;
          title: string;
          description?: string | null;
          status?: string;
          due_at?: string | null;
          priority?: string;
          is_locked?: boolean;
          created_at?: string;
          updated_at?: string;
          event_function_id?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          event_id?: string;
          title?: string;
          description?: string | null;
          status?: string;
          due_at?: string | null;
          priority?: string;
          is_locked?: boolean;
          created_at?: string;
          updated_at?: string;
          event_function_id?: string | null;
        };
        Relationships: [];
      };
      vendor_requirements: {
        Row: {
          id: string;
          workspace_id: string;
          event_id: string;
          title: string;
          category: string;
          status: string;
          notes: string | null;
          quote_source: string | null;
          is_locked: boolean;
          estimated_cost_minor: number | null;
          due_at: string | null;
          created_at: string;
          updated_at: string;
          event_function_id: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          event_id: string;
          title: string;
          category: string;
          status?: string;
          notes?: string | null;
          quote_source?: string | null;
          is_locked?: boolean;
          estimated_cost_minor?: number | null;
          due_at?: string | null;
          created_at?: string;
          updated_at?: string;
          event_function_id?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          event_id?: string;
          title?: string;
          category?: string;
          status?: string;
          notes?: string | null;
          quote_source?: string | null;
          is_locked?: boolean;
          estimated_cost_minor?: number | null;
          due_at?: string | null;
          created_at?: string;
          updated_at?: string;
          event_function_id?: string | null;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: string;
          state: string;
          joined_at: string;
          revoked_at: string | null;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role: string;
          state?: string;
          joined_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          workspace_id?: string;
          user_id?: string;
          role?: string;
          state?: string;
          joined_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          kind: string;
          personal_owner_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          kind?: string;
          personal_owner_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          kind?: string;
          personal_owner_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Functions: {
      create_personal_workspace: {
        Args: Record<string, never>;
        Returns: string;
      };
      event_command: {
        Args: {
          p_event_id: string | null;
          p_workspace_id: string | null;
          p_action: string;
          p_payload: Json;
          p_expected_version: number | null;
          p_idempotency_key: string;
          p_request_id: string;
        };
        Returns: Json;
      };
      event_function_command: {
        Args: {
          p_event_id: string | null;
          p_action: string;
          p_payload: Json;
          p_expected_version: number | null;
          p_idempotency_key: string;
          p_request_id: string;
        };
        Returns: Json;
      };
      event_functions_snapshot: {
        Args: { p_event_id: string | null };
        Returns: Json;
      };
      event_snapshot: { Args: { p_event_id: string | null }; Returns: Json };
    };
  };
};
