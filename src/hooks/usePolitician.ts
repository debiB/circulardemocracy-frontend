import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { getSupabase } from "@/lib/supabase";

export const politicianSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  additional_emails: z.array(z.string().email("Invalid email address")),
  party: z.string().nullable().optional(),
  country: z.string().length(2, "Country must be 2 characters").nullable().optional(),
  region: z.string().nullable().optional(),
  level: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  active: z.boolean(),
  reply_to: z.string().email("Invalid email address").nullable().optional(),
});

export type PoliticianFormValues = z.infer<typeof politicianSchema>;

export interface Politician extends PoliticianFormValues {
  id: number;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchPolitician(): Promise<Politician> {
  const { data, error } = await getSupabase()
    .from("politicians")
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Politician not found. You might not have permission to view it.");
  }

  return {
    ...data,
    active: data.active ?? true,
    additional_emails: data.additional_emails || [],
  } as Politician;
}

export function usePolitician() {
  return useSuspenseQuery<Politician, Error>({
    queryKey: ["politician"],
    queryFn: fetchPolitician,
  });
}
