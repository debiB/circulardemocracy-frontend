import type { User } from "@supabase/supabase-js";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/useUser";
import { getSupabase } from "@/lib/supabase";

const profileSchema = z.object({
  firstname: z.string().min(1, "First name is required"),
  lastname: z.string().min(1, "Last name is required"),
  job_title: z.string().min(1, "Job title is required"),
});

const profileDbRowSchema = z.object({
  id: z.string(),
  firstname: z.string().nullable().optional(),
  lastname: z.string().nullable().optional(),
  job_title: z.string().nullable().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type ProfileEditorValues = ProfileFormValues;

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
}> {
  const { data, error } = await getSupabase()
    .from("politician_staff_with_profile")
    .select("firstname, lastname, job_title")
    .eq("user_id", userId)
    .limit(1);

  if (error || !data?.[0]) {
    return { firstname: "", lastname: "", job_title: "" };
  }

  const row = data[0] as {
    firstname: string | null;
    lastname: string | null;
    job_title: string | null;
  };
  return {
    firstname: trimOrEmpty(row.firstname),
    lastname: trimOrEmpty(row.lastname),
    job_title: trimOrEmpty(row.job_title),
  };
}

async function resolveProfileForEditor(
  userId: string,
  user: User,
): Promise<ProfileEditorValues> {
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

  const fromRow: ProfileEditorValues = {
    firstname: pickFirstNonEmpty(row?.firstname),
    lastname: pickFirstNonEmpty(row?.lastname),
    job_title: pickFirstNonEmpty(row?.job_title),
  };

  const needsStaffFallback =
    !fromRow.firstname || !fromRow.lastname || !fromRow.job_title;

  const staff = needsStaffFallback
    ? await fetchStaffProfileDefaults(userId)
    : { firstname: "", lastname: "", job_title: "" };

  const merged: ProfileEditorValues = {
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

function ProfilePageContent({ currentUser }: { currentUser: User }) {
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: profile } = useSuspenseQuery<ProfileEditorValues, Error>({
    queryKey: ["profile", currentUser.id],
    queryFn: () => resolveProfileForEditor(currentUser.id, currentUser),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstname: "",
      lastname: "",
      job_title: "",
    },
  });

  useEffect(() => {
    reset({
      firstname: profile.firstname,
      lastname: profile.lastname,
      job_title: profile.job_title,
    });
  }, [profile, reset]);

  const onSubmit = async (values: ProfileFormValues) => {
    setSaveError(null);

    const { error } = await getSupabase().from("profiles").upsert(
      {
        id: currentUser.id,
        firstname: values.firstname,
        lastname: values.lastname,
        job_title: values.job_title,
      },
      { onConflict: "id" },
    );

    if (error) {
      setSaveError(error.message ?? "Failed to save profile");
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["profile", currentUser.id],
    });

    toast("Profile saved", {
      description: "Your profile was saved successfully.",
    });
  };

  return (
    <PageLayout>
      <div className="relative">
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle className="text-primary">Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {saveError && (
              <p className="mb-4 text-sm text-red-500">{saveError}</p>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="First name"
                {...register("firstname")}
                errorMessage={errors.firstname?.message}
                disabled={isSubmitting}
              />
              <Input
                label="Last name"
                {...register("lastname")}
                errorMessage={errors.lastname?.message}
                disabled={isSubmitting}
              />
              <Input
                label="Job title"
                {...register("job_title")}
                errorMessage={errors.job_title?.message}
                disabled={isSubmitting}
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save profile"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

export function ProfilePage() {
  const { data: currentUser } = useUser();

  if (!currentUser) {
    return null;
  }

  return <ProfilePageContent currentUser={currentUser} />;
}
