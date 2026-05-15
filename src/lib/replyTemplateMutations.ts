import { getSupabase } from "@/lib/supabase";
import { getApiErrorMessage } from "@/lib/utils";

export type ReplyLayoutType = "text_only" | "standard_header";
export type ReplySendTiming = "immediate" | "office_hours" | "scheduled";

export interface ReplyTemplateInsertPayload {
  campaign_id: number;
  name: string;
  subject: string;
  body: string;
  layout_type: ReplyLayoutType;
  send_timing: ReplySendTiming;
  scheduled_for: string | null;
  active: boolean;
}

export type ReplyTemplateUpdatePayload = Partial<ReplyTemplateInsertPayload>;

async function deactivateOtherTemplatesForCampaign(
  campaignId: number,
  excludeTemplateId?: number,
): Promise<void> {
  const sb = getSupabase();
  let q = sb
    .from("reply_templates")
    .update({ active: false })
    .eq("campaign_id", campaignId);
  if (excludeTemplateId != null) {
    q = q.neq("id", excludeTemplateId);
  }
  const { error } = await q;
  if (error) {
    throw new Error(
      getApiErrorMessage(error, "Failed to deactivate other templates"),
    );
  }
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

function throwDuplicateActiveTemplateError(): never {
  throw new Error(
    "Only one reply template can be active per campaign. Deactivate the other active template or try saving again.",
  );
}

export async function insertReplyTemplate(
  payload: ReplyTemplateInsertPayload,
): Promise<void> {
  const sb = getSupabase();

  if (payload.active) {
    await deactivateOtherTemplatesForCampaign(payload.campaign_id);
  }

  const { error } = await sb.from("reply_templates").insert(payload);

  if (error) {
    if (isUniqueViolation(error)) {
      throwDuplicateActiveTemplateError();
    }
    throw new Error(getApiErrorMessage(error, "Failed to create template"));
  }
}

export async function updateReplyTemplate(
  id: number,
  payload: ReplyTemplateUpdatePayload,
): Promise<void> {
  const sb = getSupabase();

  if (payload.active === true) {
    let campaignId = payload.campaign_id;
    if (campaignId == null) {
      const { data: row, error: fetchError } = await sb
        .from("reply_templates")
        .select("campaign_id")
        .eq("id", id)
        .maybeSingle();

      if (fetchError) {
        throw new Error(
          getApiErrorMessage(fetchError, "Failed to load template"),
        );
      }
      campaignId = row?.campaign_id ?? undefined;
    }
    if (campaignId != null) {
      await deactivateOtherTemplatesForCampaign(campaignId, id);
    }
  }

  const { data, error } = await sb
    .from("reply_templates")
    .update(payload)
    .eq("id", id)
    .select("id");

  if (error) {
    if (isUniqueViolation(error)) {
      throwDuplicateActiveTemplateError();
    }
    throw new Error(getApiErrorMessage(error, "Failed to update template"));
  }
  if (!data?.length) {
    throw new Error("Template not found or you do not have access.");
  }
}

export async function deleteReplyTemplate(id: number): Promise<void> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("reply_templates")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    throw new Error(getApiErrorMessage(error, "Failed to delete template"));
  }
  if (!data?.length) {
    throw new Error("Template not found or you do not have access.");
  }
}
