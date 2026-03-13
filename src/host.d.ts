// Ambient declarations for CMS host-provided modules.
// These are satisfied at runtime by the CMS host — the plugin repo only needs
// the type shapes here so the TypeScript language server stays clean.

declare module "@/lib/supabase" {
  import type { SupabaseClient } from "@supabase/supabase-js";
  export const supabase: SupabaseClient;
}

declare module "@/contexts/AuthContext" {
  export function useAuth(): {
    user: { id: string; email: string } | null;
    session: { access_token: string } | null;
    loading: boolean;
  };
}

declare module "@/components/ui/card" {
  import type { ReactNode, FC } from "react";
  interface CardProps { className?: string; children?: ReactNode }
  export const Card: FC<CardProps>;
  export const CardContent: FC<CardProps>;
  export const CardHeader: FC<CardProps>;
  export const CardTitle: FC<CardProps>;
}

declare module "@/components/ui/badge" {
  import type { ReactNode, FC } from "react";
  export const Badge: FC<{ variant?: string; className?: string; children?: ReactNode }>;
}

declare module "@/components/ui/button" {
  import type { ReactNode, FC, MouseEventHandler } from "react";
  export const Button: FC<{
    variant?: string;
    size?: string;
    className?: string;
    disabled?: boolean;
    onClick?: MouseEventHandler<HTMLButtonElement>;
    children?: ReactNode;
  }>;
}

// CSS Modules
declare module "*.module.css" {
  const styles: Record<string, string>;
  export default styles;
}
