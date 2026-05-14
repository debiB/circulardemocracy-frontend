import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { TemplateForm } from "@/components/TemplateForm";
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
  deleteReplyTemplate,
  updateReplyTemplate,
} from "@/lib/replyTemplateMutations";
import { getSupabase } from "@/lib/supabase";

const loadingFallback = (
  <div className="flex items-center justify-center h-32">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

export interface ReplyTemplateRow {
  id: number;
  campaign_id: number;
  name: string;
  subject: string;
  body: string;
  active: boolean;
  layout_type: "text_only" | "standard_header";
  send_timing: "immediate" | "office_hours" | "scheduled";
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchTemplatesForCampaign(
  campaignId: number,
): Promise<ReplyTemplateRow[]> {
  const { data, error } = await getSupabase()
    .from("reply_templates")
    .select(
      "id, campaign_id, name, subject, body, active, layout_type, send_timing, scheduled_for, created_at, updated_at",
    )
    .eq("campaign_id", campaignId)
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }
  return (data ?? []) as ReplyTemplateRow[];
}

async function fetchTemplateById(id: number): Promise<ReplyTemplateRow> {
  const { data, error } = await getSupabase()
    .from("reply_templates_with_campaign")
    .select(
      "id, campaign_id, name, subject, body, active, layout_type, send_timing, scheduled_for, created_at, updated_at",
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to fetch template");
  }

  return data as ReplyTemplateRow;
}

export interface CampaignReplyTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: number | null;
  campaignName: string;
}

export function CampaignReplyTemplatesDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName,
}: CampaignReplyTemplatesDialogProps) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<ReplyTemplateRow | null>(null);
  const [templatePendingDelete, setTemplatePendingDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setShowAddForm(false);
      setEditingTemplate(null);
      setTemplatePendingDelete(null);
    }
  }, [open]);

  const {
    data: templates = [],
    isLoading,
    error: listError,
    refetch,
  } = useQuery<ReplyTemplateRow[], Error>({
    queryKey: ["campaign-reply-templates", campaignId],
    queryFn: () => {
      if (campaignId == null) {
        return Promise.resolve([]);
      }
      return fetchTemplatesForCampaign(campaignId);
    },
    enabled: open && campaignId != null,
  });

  const activateMutation = useMutation({
    mutationFn: (templateId: number) =>
      updateReplyTemplate(templateId, { active: true }),
    onSuccess: async () => {
      toast.success("Template activated");
      await queryClient.invalidateQueries({
        queryKey: ["campaign-reply-templates", campaignId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["campaigns-with-extras"],
      });
      await refetch();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to activate template");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (templateId: number) =>
      updateReplyTemplate(templateId, { active: false }),
    onSuccess: async () => {
      toast.success("Template deactivated");
      await queryClient.invalidateQueries({
        queryKey: ["campaign-reply-templates", campaignId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["campaigns-with-extras"],
      });
      await refetch();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to deactivate template");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (templateId: number) => deleteReplyTemplate(templateId),
    onSuccess: async () => {
      toast.success("Template deleted");
      await queryClient.invalidateQueries({
        queryKey: ["campaign-reply-templates", campaignId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["campaigns-with-extras"],
      });
      await queryClient.invalidateQueries({ queryKey: ["reply-templates"] });
      await refetch();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete template");
    },
  });

  const hasActive = templates.some((t) => t.active);
  const defaultActiveForNew = !hasActive;

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleConfirmDelete = async () => {
    if (!templatePendingDelete) {
      return;
    }
    const id = templatePendingDelete.id;
    try {
      await deleteMutation.mutateAsync(id);
      setTemplatePendingDelete(null);
      setEditingTemplate((prev) => (prev?.id === id ? null : prev));
    } catch {
      // Error surfaced by deleteMutation.onError
    }
  };

  return (
    <>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="!w-[96vw] !max-w-6xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <AlertDialogTitle>Reply templates</AlertDialogTitle>
              <AlertDialogDescription>
                {campaignName ? `${campaignName} — ` : ""}
                One template may be active per campaign. Replies are sent by the
                backend worker, not from this screen.
              </AlertDialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 shrink-0 p-0"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDialogHeader>

          {campaignId == null ? null : (
            <div className="space-y-4">
              {listError && (
                <p className="text-sm text-red-600">
                  {listError.message || "Failed to load templates"}
                </p>
              )}

              {isLoading ? (
                loadingFallback
              ) : (
                <div className="rounded-md border border-border">
                  {templates.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">
                      No templates yet. Add one below.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {templates.map((t) => (
                        <li
                          key={t.id}
                          className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{t.name}</p>
                            <p className="text-muted-foreground truncate">
                              {t.subject}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t.active ? "Active" : "Inactive"} ·{" "}
                              {t.send_timing}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 shrink-0">
                            {!t.active && (
                              <Button
                                type="button"
                                size="sm"
                                variant="default"
                                disabled={activateMutation.isPending}
                                onClick={() => activateMutation.mutate(t.id)}
                              >
                                Activate
                              </Button>
                            )}
                            {t.active && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={deactivateMutation.isPending}
                                onClick={() => deactivateMutation.mutate(t.id)}
                              >
                                Deactivate
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={async () => {
                                try {
                                  const row = await fetchTemplateById(t.id);
                                  setEditingTemplate(row);
                                  setShowAddForm(false);
                                } catch (e) {
                                  console.error(e);
                                  toast.error(
                                    "Failed to load template for edit",
                                  );
                                }
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={deleteMutation.isPending}
                              onClick={() =>
                                setTemplatePendingDelete({
                                  id: t.id,
                                  name: t.name,
                                })
                              }
                            >
                              Delete
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {!showAddForm && !editingTemplate && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowAddForm(true);
                    setEditingTemplate(null);
                  }}
                >
                  Add template
                </Button>
              )}

              {showAddForm && !editingTemplate && campaignId != null && (
                <div className="border-t pt-4 space-y-2">
                  <p className="text-sm font-medium">New template</p>
                  <Suspense fallback={loadingFallback}>
                    <TemplateForm
                      initialData={{
                        campaign_id: campaignId,
                        active: defaultActiveForNew,
                      }}
                      onSuccess={async () => {
                        setShowAddForm(false);
                        await queryClient.invalidateQueries({
                          queryKey: ["campaign-reply-templates", campaignId],
                        });
                        await queryClient.invalidateQueries({
                          queryKey: ["campaigns-with-extras"],
                        });
                        await refetch();
                      }}
                      onCancel={() => setShowAddForm(false)}
                    />
                  </Suspense>
                </div>
              )}

              {editingTemplate && (
                <div className="border-t pt-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Edit template</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingTemplate(null)}
                    >
                      Back to list
                    </Button>
                  </div>
                  <Suspense fallback={loadingFallback}>
                    <TemplateForm
                      initialData={{
                        ...editingTemplate,
                        send_timing: editingTemplate.send_timing,
                        scheduled_for:
                          editingTemplate.scheduled_for || undefined,
                      }}
                      onSuccess={async () => {
                        setEditingTemplate(null);
                        await queryClient.invalidateQueries({
                          queryKey: ["campaign-reply-templates", campaignId],
                        });
                        await queryClient.invalidateQueries({
                          queryKey: ["campaigns-with-extras"],
                        });
                        await refetch();
                      }}
                      onCancel={() => setEditingTemplate(null)}
                    />
                  </Suspense>
                </div>
              )}
            </div>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={templatePendingDelete !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setTemplatePendingDelete(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              {templatePendingDelete ? (
                <>
                  This will permanently remove{" "}
                  <span className="font-medium text-foreground">
                    &quot;{templatePendingDelete.name}&quot;
                  </span>
                  . This cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              type="button"
              disabled={deleteMutation.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => void handleConfirmDelete()}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
