export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      career_histories: {
        Row: {
          company_name: string;
          created_at: string;
          employee_id: string;
          end_date: string | null;
          id: string;
          memo: string | null;
          order_idx: number;
          role: string | null;
          start_date: string | null;
        };
        Insert: {
          company_name: string;
          created_at?: string;
          employee_id: string;
          end_date?: string | null;
          id?: string;
          memo?: string | null;
          order_idx?: number;
          role?: string | null;
          start_date?: string | null;
        };
        Update: {
          company_name?: string;
          created_at?: string;
          employee_id?: string;
          end_date?: string | null;
          id?: string;
          memo?: string | null;
          order_idx?: number;
          role?: string | null;
          start_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "career_histories_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          is_hq: boolean;
          name: string;
          order_idx: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          is_hq?: boolean;
          name: string;
          order_idx?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          is_hq?: boolean;
          name?: string;
          order_idx?: number;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          category_id: string;
          ceo_name: string | null;
          created_at: string;
          id: string;
          name: string;
          order_idx: number;
        };
        Insert: {
          category_id: string;
          ceo_name?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          order_idx?: number;
        };
        Update: {
          category_id?: string;
          ceo_name?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          order_idx?: number;
        };
        Relationships: [
          {
            foreignKeyName: "companies_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      departments: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          kind: string;
          name: string;
          order_idx: number;
          parent_department_id: string | null;
          worksite_id: string | null;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          kind?: string;
          name: string;
          order_idx?: number;
          parent_department_id?: string | null;
          worksite_id?: string | null;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          name?: string;
          order_idx?: number;
          parent_department_id?: string | null;
          worksite_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "departments_parent_department_id_fkey";
            columns: ["parent_department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "departments_worksite_id_fkey";
            columns: ["worksite_id"];
            isOneToOne: false;
            referencedRelation: "worksites";
            referencedColumns: ["id"];
          },
        ];
      };
      employees: {
        Row: {
          accounting_type_code: string | null;
          annual_salary: number | null;
          birth_date: string | null;
          career_before_join_years: number | null;
          company_id: string;
          created_at: string;
          department_id: string | null;
          education_code: string | null;
          employee_no: string | null;
          employment_type_code: string | null;
          gender: string | null;
          hire_channel_code: string | null;
          hire_date: string | null;
          id: string;
          job_family_code: string | null;
          memo: string | null;
          name: string;
          nationality: string | null;
          nationality_type: string | null;
          rank_code: string | null;
          status_code: string;
          termination_date: string | null;
          termination_reason_code: string | null;
          total_career_years: number | null;
          updated_at: string;
          worksite_id: string | null;
        };
        Insert: {
          accounting_type_code?: string | null;
          annual_salary?: number | null;
          birth_date?: string | null;
          career_before_join_years?: number | null;
          company_id: string;
          created_at?: string;
          department_id?: string | null;
          education_code?: string | null;
          employee_no?: string | null;
          employment_type_code?: string | null;
          gender?: string | null;
          hire_channel_code?: string | null;
          hire_date?: string | null;
          id?: string;
          job_family_code?: string | null;
          memo?: string | null;
          name: string;
          nationality?: string | null;
          nationality_type?: string | null;
          rank_code?: string | null;
          status_code?: string;
          termination_date?: string | null;
          termination_reason_code?: string | null;
          total_career_years?: number | null;
          updated_at?: string;
          worksite_id?: string | null;
        };
        Update: {
          accounting_type_code?: string | null;
          annual_salary?: number | null;
          birth_date?: string | null;
          career_before_join_years?: number | null;
          company_id?: string;
          created_at?: string;
          department_id?: string | null;
          education_code?: string | null;
          employee_no?: string | null;
          employment_type_code?: string | null;
          gender?: string | null;
          hire_channel_code?: string | null;
          hire_date?: string | null;
          id?: string;
          job_family_code?: string | null;
          memo?: string | null;
          name?: string;
          nationality?: string | null;
          nationality_type?: string | null;
          rank_code?: string | null;
          status_code?: string;
          termination_date?: string | null;
          termination_reason_code?: string | null;
          total_career_years?: number | null;
          updated_at?: string;
          worksite_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employees_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employees_worksite_id_fkey";
            columns: ["worksite_id"];
            isOneToOne: false;
            referencedRelation: "worksites";
            referencedColumns: ["id"];
          },
        ];
      };
      import_logs: {
        Row: {
          company_id: string | null;
          file_name: string;
          id: string;
          sheet_type: string;
          skipped_count: number;
          uploaded_at: string;
          uploaded_by: string | null;
          upserted_count: number;
        };
        Insert: {
          company_id?: string | null;
          file_name: string;
          id?: string;
          sheet_type: string;
          skipped_count?: number;
          uploaded_at?: string;
          uploaded_by?: string | null;
          upserted_count?: number;
        };
        Update: {
          company_id?: string | null;
          file_name?: string;
          id?: string;
          sheet_type?: string;
          skipped_count?: number;
          uploaded_at?: string;
          uploaded_by?: string | null;
          upserted_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "import_logs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      lookups: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          is_active: boolean;
          label: string;
          order_idx: number;
          type: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          label: string;
          order_idx?: number;
          type: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          label?: string;
          order_idx?: number;
          type?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          role: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          role?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          role?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      worksites: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          name: string;
          order_idx: number;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          name: string;
          order_idx?: number;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          order_idx?: number;
        };
        Relationships: [
          {
            foreignKeyName: "worksites_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_group_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
