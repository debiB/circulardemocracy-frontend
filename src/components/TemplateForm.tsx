import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { SendTimingSelector } from "@/components/SendTimingSelector";
import { TemplatePreview } from "@/components/TemplatePreview";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { getApiErrorMessage } from "@/lib/utils";

interface Campaign {
  id: number;
  name: string;
}

const templateFormSchema = z
  .object({
    campaign_id: z.number().positive("Campaign is required"),
    name: z
      .string()
      .min(3, "Template name must be at least 3 characters")
      .max(100, "Template name must be less than 100 characters"),
    subject: z
      .string()
      .min(1, "Subject is required")
      .max(255, "Subject must be less than 255 characters"),
    body: z
      .string()
      .min(10, "Message body must be at least 10 characters")
      .max(10000, "Message body is too long"),
    layout_type: z.enum(["text_only", "standard_header"]),
    send_timing: z.enum(["immediate", "office_hours", "scheduled"]),
    scheduled_for: z.string().optional(),
    active: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.send_timing === "scheduled") {
        return !!data.scheduled_for && data.scheduled_for.length > 0;
      }
      return true;
    },
    {
      message:
        "Scheduled date/time is required when send timing is set to scheduled",
      path: ["scheduled_for"],
    },
  );

type TemplateFormData = z.infer<typeof templateFormSchema>;
type SendTimingValue = "immediate" | "office_hours" | "scheduled";

interface TemplateFormProps {
  initialData?: Partial<TemplateFormData> & { id?: number };
  onSuccess?: () => void;
  onCancel?: () => void;
}

async function fetchCampaigns(): Promise<Campaign[]> {
  try {
    const { data, error } = await getSupabase()
      .from("campaigns")
      .select("id, name")
      .order("name");
    if (error) {
      console.error("Error fetching campaigns:", error);
      throw error;
    }
    // Defensive check: ensure data is an array
    return data && Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error in fetchCampaigns:", error);
    throw error; // Re-throw for error boundary
  }
}

async function createTemplate(
  templateData: Omit<TemplateFormData, "active">,
): Promise<any> {
  try {
    const payload = {
      ...templateData,
      body: templateData.body || "",
      layout_type: templateData.layout_type || "standard_header",
    };

    console.log("Template data sent:", payload);

    const response = await api.post("/api/v1/reply-templates", payload);

    if (!response.ok) {
      let errorMessage = "Failed to create template";
      try {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        errorMessage = getApiErrorMessage(
          errorText,
          "Failed to create template",
        );
      } catch (parseError) {
        console.error("Error parsing error response:", parseError);
      }
      throw new Error(errorMessage);
    }

    const responseText = await response.text();
    console.log("API Response:", responseText);

    if (!responseText) {
      throw new Error("Empty response from server");
    }

    try {
      return JSON.parse(responseText);
    } catch (error) {
      console.error("JSON Parse Error:", error);
      console.error("Response text:", responseText);
      throw new Error("Invalid response from server. Please try again.");
    }
  } catch (error) {
    // Re-throw with a user-friendly message
    const message = getApiErrorMessage(error, "Failed to create template");
    throw new Error(message);
  }
}

async function updateTemplate(
  id: number,
  templateData: Partial<Omit<TemplateFormData, "active">>,
): Promise<any> {
  try {
    const payload: Record<string, any> = { ...templateData };
    if (templateData.body !== undefined) {
      payload.body = templateData.body || "";
    }
    if (!payload.layout_type) {
      payload.layout_type = "standard_header";
    }

    console.log("Updating template:", id, payload);

    const response = await api.patch(`/api/v1/reply-templates/${id}`, payload);

    if (!response.ok) {
      let errorMessage = "Failed to update template";
      try {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        errorMessage = getApiErrorMessage(
          errorText,
          "Failed to update template",
        );
      } catch (parseError) {
        console.error("Error parsing error response:", parseError);
      }
      throw new Error(errorMessage);
    }

    const responseText = await response.text();
    console.log("API Response:", responseText);

    if (!responseText) {
      throw new Error("Empty response from server");
    }

    try {
      return JSON.parse(responseText);
    } catch (error) {
      console.error("JSON Parse Error:", error);
      console.error("Response text:", responseText);
      throw new Error("Invalid response from server. Please try again.");
    }
  } catch (error) {
    // Re-throw with a user-friendly message
    const message = getApiErrorMessage(error, "Failed to update template");
    throw new Error(message);
  }
}

export function TemplateForm({
  initialData,
  onSuccess,
  onCancel,
}: TemplateFormProps) {
  const queryClient = useQueryClient();
  const isEditMode = !!initialData?.id;

  const { data: campaigns } = useSuspenseQuery<Campaign[], Error>({
    queryKey: ["campaigns"],
    queryFn: fetchCampaigns,
  });

  const [sendTiming, setSendTiming] = useState<SendTimingValue>(
    initialData?.send_timing || "immediate",
  );
  const [showPreview, setShowPreview] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setValue,
    watch,
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    mode: "onChange",
    defaultValues: {
      name: initialData?.name || "",
      subject: initialData?.subject || "",
      body: initialData?.body ?? "",
      campaign_id: initialData?.campaign_id,
      layout_type: (initialData as any)?.layout_type || "standard_header",
      send_timing: initialData?.send_timing || "immediate",
      scheduled_for: initialData?.scheduled_for || "",
      active: initialData?.active ?? true,
    },
  });

  const createMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reply-templates"] });
      toast.success("Template created successfully");
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create template");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: {
      id: number;
      templateData: Partial<Omit<TemplateFormData, "active">>;
    }) => updateTemplate(data.id, data.templateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reply-templates"] });
      toast.success("Template updated successfully");
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update template");
    },
  });

  const onSubmit = async (data: TemplateFormData) => {
    try {
      const { active, ...templateData } = data;

      if (data.send_timing !== "scheduled") {
        delete templateData.scheduled_for;
      }

      if (isEditMode && initialData?.id) {
        await updateMutation.mutateAsync({ id: initialData.id, templateData });
      } else {
        await createMutation.mutateAsync(templateData);
      }
    } catch (error) {
      // Error is already handled by mutation's onError callback
      // This catch prevents unhandled promise rejection
      console.error("Form submission error:", error);
    }
  };

  const activeValue = watch("active");
  const subjectValue = watch("subject");
  const bodyValue = watch("body");
  const campaignIdValue = watch("campaign_id");

  // Defensive campaign lookup with null check
  const selectedCampaign =
    campaigns && Array.isArray(campaigns)
      ? campaigns.find((c) => c?.id === campaignIdValue)
      : undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="campaign_id">Campaign *</FieldLabel>
          <Select
            value={watch("campaign_id")?.toString()}
            onValueChange={(value) =>
              setValue("campaign_id", parseInt(value, 10))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns && Array.isArray(campaigns) && campaigns.length > 0 ? (
                campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id.toString()}>
                    {campaign.name || "Unnamed Campaign"}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="" disabled>
                  No campaigns available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {errors.campaign_id && (
            <FieldError>{errors.campaign_id.message}</FieldError>
          )}
        </Field>

        <Input
          label="Template Name *"
          {...register("name")}
          errorMessage={errors.name?.message}
          placeholder="e.g., Standard Reply"
        />
      </div>

      <Input
        label="Subject Line *"
        {...register("subject")}
        errorMessage={errors.subject?.message}
        placeholder="e.g., Thank you for your message"
      />

      <Field>
        <FieldLabel htmlFor="body">Message Body (Markdown) *</FieldLabel>
        <Textarea
          id="body"
          {...register("body")}
          placeholder="Write your template message here. You can use Markdown formatting."
          rows={10}
          className="font-mono text-sm"
        />
        <FieldDescription>
          Use Markdown syntax for formatting (e.g., **bold**, *italic*,
          [links](url)). Minimum 10 characters required.
        </FieldDescription>
        {errors.body && <FieldError>{errors.body.message}</FieldError>}
      </Field>

      <SendTimingSelector
        value={sendTiming}
        onValueChange={(value) => {
          setSendTiming(value);
          setValue("send_timing", value, { shouldValidate: true });
        }}
        scheduledDateTime={watch("scheduled_for")}
        onScheduledDateTimeChange={(value) =>
          setValue("scheduled_for", value, { shouldValidate: true })
        }
        error={errors.scheduled_for?.message}
      />

      <Field orientation="horizontal">
        <div className="flex items-center gap-2">
          <input
            id="active"
            type="checkbox"
            {...register("active")}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <FieldLabel htmlFor="active" className="mb-0">
            Active
          </FieldLabel>
        </div>
        <FieldDescription>
          {activeValue
            ? "This template is active and can be used"
            : "This template is inactive"}
        </FieldDescription>
      </Field>

      {/* Preview Toggle */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-sm font-medium text-primary hover:underline"
        >
          {showPreview ? "Hide Preview" : "Show Preview"}
        </button>
      </div>

      {/* Live Preview */}
      {showPreview && subjectValue && bodyValue && (
        <TemplatePreview
          subject={subjectValue}
          body={bodyValue}
          sendTiming={sendTiming}
          scheduledFor={watch("scheduled_for")}
          personalizationData={{
            name: "John Doe",
            campaign: selectedCampaign?.name || "Sample Campaign",
          }}
        />
      )}

      <div className="flex gap-3 justify-end pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={
            !isValid ||
            isSubmitting ||
            createMutation.isPending ||
            updateMutation.isPending
          }
        >
          {isSubmitting || createMutation.isPending || updateMutation.isPending
            ? "Saving..."
            : isEditMode
              ? "Update Template"
              : "Create Template"}
        </Button>
      </div>
    </form>
  );
}
