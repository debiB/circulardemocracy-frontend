import type { User } from "@supabase/supabase-js";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "./useUser";

export const profileSchema = z.object({
  firstname: z.string().min(1, "First name is required"),
  lastname: z.string().min(1, "Last name is required"),
  job_title: z.string().min(1, "Job title is required"),
});

export const profileDbRowSchema = z.object({
  id: z.string(),
  firstname: z.string().nullable().optional(),
  lastname: z.string().nullable().optional(),
  job_title: z.string().nullable().optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
export interface UserProfile extends ProfileFormValues {
  politician_id?: number | null;
}

function trimOrEmpty(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function pickFirstNonEmpty(
  ...candidates: (string | null | undefined)[]
): string {
  for (const c of candidates) {
    const t = trimOrEmpty(c);
    if (t) return t;
  }
  return "";
}

function defaultsFromAuthUser(user: User): ProfileFormValues {
  const meta = user.user_metadata ?? {};
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  let firstname = str(meta.given_name) || str(meta.first_name);
  let lastname = str(meta.family_name) || str(meta.last_name);
  const job_title = str(meta.job_title);

  const full = str(meta.full_name) || str(meta.name);
  if ((!firstname || !lastname) && full) {
    const parts = full.split(/\s+/).filter(Boolean);
    if (!firstname && parts.length > 0) firstname = parts[0] ?? "";
    if (!lastname && parts.length > 1) lastname = parts.slice(1).join(" ");
  }

  return {
    firstname,
    lastname,
    job_title,
  };
}

async function fetchStaffProfileDefaults(userId: string): Promise<{
  firstname: string;
  lastname: string;
  job_title: string;
  politician_id?: number | null;
}> {
  const { data, error } = await getSupabase()
    .from("politician_staff_with_profile")
    .select("firstname, lastname, job_title")
    .eq("user_id", userId)
    .limit(1);

  if (error || !data?.[0]) {
    return { firstname: "", lastname: "", job_title: "", politician_id: null };
  }

  const row = data[0] as {
    firstname: string | null;
    lastname: string | null;
    job_title: string | null;
    politician_id: number | null;
  };
  return {
    firstname: trimOrEmpty(row.firstname),
    lastname: trimOrEmpty(row.lastname),
    job_title: trimOrEmpty(row.job_title),
    politician_id: row.politician_id,
  };
}

async function resolveProfile(
  userId: string,
  user: User,
): Promise<UserProfile> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id, firstname, lastname, job_title")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const parsed = data
    ? profileDbRowSchema.safeParse(data)
    : { success: false as const };

  const row = parsed.success ? parsed.data : null;

  const fromRow = {
    firstname: pickFirstNonEmpty(row?.firstname),
    lastname: pickFirstNonEmpty(row?.lastname),
    job_title: pickFirstNonEmpty(row?.job_title),
  };

  // We always fetch staff defaults to get politician_id
  const staff = await fetchStaffProfileDefaults(userId);

  const merged = {
    firstname: pickFirstNonEmpty(fromRow.firstname, staff.firstname),
    lastname: pickFirstNonEmpty(fromRow.lastname, staff.lastname),
    job_title: pickFirstNonEmpty(fromRow.job_title, staff.job_title),
  };

  const needsAuthFallback =
    !merged.firstname || !merged.lastname || !merged.job_title;

  const authDefaults = needsAuthFallback ? defaultsFromAuthUser(user) : null;

  return {
    firstname: pickFirstNonEmpty(merged.firstname, authDefaults?.firstname),
    lastname: pickFirstNonEmpty(merged.lastname, authDefaults?.lastname),
    job_title: pickFirstNonEmpty(merged.job_title, authDefaults?.job_title),
  };
}

export function useProfile() {
  const { data: user } = useUser();

  return useSuspenseQuery<UserProfile, Error>({
    queryKey: ["profile", user?.id],
    queryFn: () => {
      if (!user) throw new Error("No user found");
      return resolveProfile(user.id, user);
    },
  });
}
