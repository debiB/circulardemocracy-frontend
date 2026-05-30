import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/useUser";
import { useProfile, profileSchema, type ProfileFormValues } from "@/hooks/useProfile";
import { getSupabase } from "@/lib/supabase";

function ProfilePageContent({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: profile } = useProfile();

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
        id: userId,
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
      queryKey: ["profile", userId],
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

  return <ProfilePageContent userId={currentUser.id} />;
}
