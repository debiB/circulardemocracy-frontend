import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSupabase } from "@/lib/supabase";

interface Campaign {
  id: number;
  name: string;
}

interface Message {
  id: number;
  external_id: string | null;
  sender_country: string | null;
  duplicate_rank: number;
  classification_confidence: number;
  language: string;
  received_at: string;
  processed_at: string;
  reply_sent_at: string | null;
  reply_template_id: number | null;
  processing_status: string;
}

async function fetchCampaigns(): Promise<Campaign[]> {
  const { data, error } = await getSupabase()
    .from("campaigns")
    .select("id, name")
    .order("name");

  if (error) {
    console.error("Error fetching campaigns:", error);
    throw error;
  }

  return (data ?? []).filter(
    (row): row is Campaign => row != null && typeof row.id === "number",
  );
}

interface ClassifyDialogProps {
  message: Message | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClassified?: () => void;
}

export function ClassifyDialog({
  message,
  open,
  onOpenChange,
  onClassified,
}: ClassifyDialogProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");

  const { data: campaigns } = useSuspenseQuery<Campaign[], Error>({
    queryKey: ["campaigns"],
    queryFn: fetchCampaigns,
  });

  const classifyMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      if (!message) return;
      const { error } = await getSupabase()
        .from("messages")
        .update({ campaign_id: campaignId })
        .eq("id", message.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message classified successfully");
      onOpenChange(false);
      setSelectedCampaignId("");
      onClassified?.();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to classify message");
    },
  });

  const handleClassify = () => {
    const id = parseInt(selectedCampaignId, 10);
    if (!id) return;
    classifyMutation.mutate(id);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Classify Message</AlertDialogTitle>
          <AlertDialogDescription>
            Assign this message to a campaign.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <Select
            value={selectedCampaignId}
            onValueChange={setSelectedCampaignId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((campaign) => (
                <SelectItem
                  key={campaign.id}
                  value={campaign.id.toString()}
                >
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setSelectedCampaignId("")}>
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={!selectedCampaignId || classifyMutation.isPending}
            onClick={handleClassify}
          >
            {classifyMutation.isPending ? "Classifying..." : "Classify"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
