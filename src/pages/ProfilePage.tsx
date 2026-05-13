import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
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

const profileSelectSchema = profileSchema.extend({
  id: z.string(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type ProfileRow = z.infer<typeof profileSelectSchema>;

async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id, firstname, lastname, job_title")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const parsed = profileSelectSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid profile data");
  }

  return parsed.data;
}

export function ProfilePage() {
  const { data: currentUser } = useUser();
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery<ProfileRow | null, Error>({
    queryKey: ["profile", currentUser?.id],
    queryFn: () => fetchProfile(currentUser!.id),
    enabled: !!currentUser?.id,
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
    if (profile) {
      reset({
        firstname: profile.firstname ?? "",
        lastname: profile.lastname ?? "",
        job_title: profile.job_title ?? "",
      });
    }
  }, [profile, reset]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!currentUser) return;
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

    toast("Profile saved", {
      description: "Your profile was saved successfully.",
    });
  };

  if (!currentUser) {
    return null;
  }

  return (
    <PageLayout>
      <div className="relative">
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle className="text-primary">Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <p className="mb-4 text-sm text-gray-600">Loading profile...</p>
            )}
            {saveError && (
              <p className="mb-4 text-sm text-red-500">{saveError}</p>
            )}
            {!isLoading && (
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
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
