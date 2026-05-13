import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { TemplatePreview } from "@/components/TemplatePreview";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { getApiErrorMessage } from "@/lib/utils";

interface ReplyTemplate {
  id: number;
  campaign_id: number;
  name: string;
  subject: string;
  body: string;
  active: boolean;
  send_timing: string;
  scheduled_for: string | null;
}

interface TemplateAssignmentProps {
  campaignId: number;
  campaignName?: string;
  selectedMessageIds: number[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

async function fetchCampaignTemplates(
  campaignId: number,
): Promise<ReplyTemplate[]> {
  try {
    const { data, error } = await supabase!
      .from("reply_templates_with_campaign")
      .select(
        "id, campaign_id, name, subject, body, active, send_timing, scheduled_for",
      )
      .eq("campaign_id", campaignId)
      .eq("active", true)
      .order("id", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []) as ReplyTemplate[];
  } catch (error) {
    const message = getApiErrorMessage(
      error,
      "Failed to fetch reply templates",
    );
    throw new Error(message);
  }
}

export function TemplateAssignment({
  campaignId,
  campaignName,
  selectedMessageIds,
  onSuccess,
  onCancel,
}: TemplateAssignmentProps) {
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null,
  );

  const { data: templates } = useSuspenseQuery<ReplyTemplate[], Error>({
    queryKey: ["campaign-templates", campaignId],
    queryFn: () => fetchCampaignTemplates(campaignId),
  });

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const assignMutation = useMutation({
    mutationFn: async () => {
      // TODO: Implement batch reply assignment API endpoint
      // Expected endpoint: POST /api/v1/messages/assign-reply
      // Body: { message_ids: number[], template_id: number }
      //
      // For now, this is a placeholder that shows what would be sent
      throw new Error("Batch reply assignment API not yet implemented");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-messages"] });
      queryClient.invalidateQueries({
        queryKey: ["campaign-has-reply-templates", campaignId],
      });
      toast.success(
        `Reply template assigned to ${selectedMessageIds.length} message(s)`,
      );
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to assign template");
    },
  });

  const handleAssign = () => {
    if (!selectedTemplateId) {
      toast.error("Please select a template");
      return;
    }

    // TODO: Remove this alert once API is implemented
    alert(
      `TODO: Implement batch reply assignment API\n\n` +
        `Would assign template #${selectedTemplateId} to ${selectedMessageIds.length} message(s):\n` +
        `Message IDs: ${selectedMessageIds.join(", ")}\n\n` +
        `Expected API call:\n` +
        `POST /api/v1/messages/assign-reply\n` +
        `Body: { message_ids: [${selectedMessageIds.join(", ")}], template_id: ${selectedTemplateId} }`,
    );

    // Uncomment when API is ready:
    // assignMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <p className="text-sm text-blue-800">
          <strong>{selectedMessageIds.length}</strong> message
          {selectedMessageIds.length !== 1 ? "s" : ""} selected
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-yellow-800">
            No active templates found for this campaign. Please create a
            template first.
          </p>
        </div>
      ) : (
        <>
          <Field>
            <FieldLabel htmlFor="template">Select Reply Template</FieldLabel>
            <Select
              value={selectedTemplateId?.toString() || ""}
              onValueChange={(value) =>
                setSelectedTemplateId(parseInt(value, 10))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              Select which template to use for replying to the selected messages
            </FieldDescription>
          </Field>

          {selectedTemplate && (
            <TemplatePreview
              subject={selectedTemplate.subject}
              body={selectedTemplate.body}
              sendTiming={selectedTemplate.send_timing}
              scheduledFor={selectedTemplate.scheduled_for}
              personalizationData={{
                name: "Recipient Name",
                campaign: campaignName || "Campaign",
              }}
            />
          )}
        </>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleAssign}
          disabled={
            !selectedTemplateId ||
            templates.length === 0 ||
            assignMutation.isPending
          }
        >
          {assignMutation.isPending ? "Assigning..." : "Assign Template"}
        </Button>
      </div>
    </div>
  );
}
