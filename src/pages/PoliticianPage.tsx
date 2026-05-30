import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { usePolitician, politicianSchema, type PoliticianFormValues } from "@/hooks/usePolitician";
import { getSupabase } from "@/lib/supabase";

function PoliticianPageContent() {
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: politician } = usePolitician();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<PoliticianFormValues>({
    resolver: zodResolver(politicianSchema),
    defaultValues: {
      name: "",
      email: "",
      additional_emails: [],
      party: "",
      country: "",
      region: "",
      level: "",
      position: "",
      active: true,
      reply_to: "",
    },
  });

  useEffect(() => {
    if (politician) {
      reset({
        name: politician.name,
        email: politician.email,
        additional_emails: politician.additional_emails || [],
        party: politician.party || "",
        country: politician.country || "",
        region: politician.region || "",
        level: politician.level || "",
        position: politician.position || "",
        active: politician.active ?? true,
        reply_to: politician.reply_to || "",
      });
    }
  }, [politician, reset]);

  const onSubmit = async (values: PoliticianFormValues) => {
    setSaveError(null);

    const { error } = await getSupabase()
      .from("politicians")
      .update({
        name: values.name,
        email: values.email,
        additional_emails: values.additional_emails,
        party: values.party,
        country: values.country,
        region: values.region,
        level: values.level,
        position: values.position,
        active: values.active,
        reply_to: values.reply_to,
        updated_at: new Date().toISOString(),
      })
      .eq("id", politician.id);

    if (error) {
      setSaveError(error.message ?? "Failed to save politician details");
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["politician"],
    });

    toast("Politician saved", {
      description: "Politician details were saved successfully.",
    });
  };

  const handleAdditionalEmailsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const emails = value.split(/[,\n]/).map(email => email.trim()).filter(Boolean);
    setValue("additional_emails", emails, { shouldValidate: true });
  };

  return (
    <PageLayout>
      <div className="relative">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle className="text-primary">Politician Details</CardTitle>
          </CardHeader>
          <CardContent>
            {saveError && (
              <p className="mb-4 text-sm text-red-500">{saveError}</p>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Full Name"
                  {...register("name")}
                  errorMessage={errors.name?.message}
                  disabled={isSubmitting}
                />
              </div>
              
              <Input
                label="Primary Email"
                {...register("email")}
                errorMessage={errors.email?.message}
                disabled={true}
              />

              <Input
                label="Reply To Email"
                {...register("reply_to")}
                errorMessage={errors.reply_to?.message}
                disabled={isSubmitting}
              />

              <div className="md:col-span-2">
                <Field>
                  <FieldLabel htmlFor="additional_emails">Additional Emails (comma or newline separated)</FieldLabel>
                  <Textarea
                    id="additional_emails"
                    defaultValue={politician?.additional_emails?.join(", ")}
                    onChange={handleAdditionalEmailsChange}
                    disabled={isSubmitting}
                    placeholder="email1@example.com, email2@example.com"
                  />
                  {errors.additional_emails && <FieldError>{errors.additional_emails.message}</FieldError>}
                </Field>
              </div>

              <Input
                label="Party"
                {...register("party")}
                errorMessage={errors.party?.message}
                disabled={isSubmitting}
              />

              <Input
                label="Country (2 chars)"
                {...register("country")}
                maxLength={2}
                errorMessage={errors.country?.message}
                disabled={isSubmitting}
              />

              <Input
                label="Region"
                {...register("region")}
                errorMessage={errors.region?.message}
                disabled={isSubmitting}
              />

              <Input
                label="Level"
                {...register("level")}
                errorMessage={errors.level?.message}
                disabled={isSubmitting}
              />

              <Input
                label="Position"
                {...register("position")}
                errorMessage={errors.position?.message}
                disabled={isSubmitting}
              />

              <Field orientation="horizontal" className="mt-4">
                <div className="flex items-center gap-2">
                  <input
                    id="active"
                    type="checkbox"
                    {...register("active")}
                    disabled={isSubmitting}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <FieldLabel htmlFor="active" className="mb-0">
                    Active
                  </FieldLabel>
                </div>
              </Field>

              <div className="md:col-span-2 mt-6">
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Saving..." : "Save Politician"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

import { Suspense } from "react";

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-48">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
  </div>
);

export function PoliticianPage() {
  return (
    <Suspense fallback={
      <PageLayout centerContent={true}>
        <LoadingSpinner />
      </PageLayout>
    }>
      <PoliticianPageContent />
    </Suspense>
  );
}

export default PoliticianPage;
