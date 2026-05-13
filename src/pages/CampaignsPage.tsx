import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageLayout } from "@/components/PageLayout"; // Import PageLayout
import { TemplateForm } from "@/components/TemplateForm";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils"; // Import the new utility

// A simple spinner component for fallback within the card
const LoadingSpinner = () => (
	<div className="flex items-center justify-center h-48">
		<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
	</div>
);

interface Campaign {
	id: number;
	name: string;
	created_at: string;
	updated_at: string; // Assuming 'updated_at' for modified_at
	// Add other campaign properties as needed
}

interface CampaignWithExtras extends Campaign {
	hasReplyTemplate: boolean;
	templateId?: number;
	replyTemplateCount: number;
	activeReplyTemplateCount: number;
	messageCount: number;
}

interface ReplyTemplateDetails {
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

async function fetchTemplateById(
	templateId: number,
): Promise<ReplyTemplateDetails> {
	const { data, error } = await supabase!
		.from("reply_templates_with_campaign")
		.select(
			"id, campaign_id, name, subject, body, active, layout_type, send_timing, scheduled_for, created_at, updated_at",
		)
		.eq("id", templateId)
		.single();

	if (error || !data) {
		throw error ?? new Error("Failed to fetch template");
	}

	return data as ReplyTemplateDetails;
}

async function fetchCampaignsWithExtras(): Promise<CampaignWithExtras[]> {
	try {
		const { data, error } = await supabase!
			.from("campaign_with_extra")
			.select(
				"id, name, created_at, updated_at, has_reply_template, template_id, reply_template_count, active_reply_template_count, message_count",
			)
			.order("id", { ascending: true });

		if (error) {
			throw error;
		}

		return (data ?? []).map((campaign: any) => ({
			id: campaign.id,
			name: campaign.name,
			created_at: campaign.created_at,
			updated_at: campaign.updated_at,
			hasReplyTemplate: Boolean(campaign.has_reply_template),
			templateId: campaign.template_id ?? undefined,
			replyTemplateCount: Number(campaign.reply_template_count) || 0,
			activeReplyTemplateCount:
				Number(campaign.active_reply_template_count) || 0,
			messageCount: campaign.message_count ?? 0,
		}));
	} catch (error) {
		console.error("Error fetching campaigns with extras:", error);
		throw error; // Re-throw for error boundary to catch
	}
}

export function CampaignsPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(
		null,
	);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [editingTemplate, setEditingTemplate] =
		useState<ReplyTemplateDetails | null>(null);

	const { data: campaigns } = useSuspenseQuery<CampaignWithExtras[], Error>({
		queryKey: ["campaigns-with-extras"],
		queryFn: fetchCampaignsWithExtras,
	});

	return (
		<PageLayout>
			<Card className="p-4">
				<CardHeader>
					<CardTitle className="text-primary">Campaigns</CardTitle>{" "}
				</CardHeader>
				<CardContent>
					<Suspense fallback={<LoadingSpinner />}>
						{campaigns && Array.isArray(campaigns) && campaigns.length > 0 ? (
							<div className="overflow-x-auto">
								<table className="min-w-full bg-white border border-gray-200">
									<thead>
										<tr>
											<th className="py-2 px-4 border-b text-left">ID</th>
											<th className="py-2 px-4 border-b text-left">Name</th>
											<th className="py-2 px-4 border-b text-left">
												Created At
											</th>
											<th className="py-2 px-4 border-b text-left">
												Updated At
											</th>
											<th className="py-2 px-4 border-b text-left">Messages</th>
											<th className="py-2 px-4 border-b text-left">
												Reply Template
											</th>
										</tr>
									</thead>
									<tbody>
										{campaigns.map((campaign) => (
											<tr
												key={campaign.id}
												className="cursor-pointer hover:bg-gray-50 transition-colors"
											>
												<td
													className="py-2 px-4 border-b"
													onClick={() => navigate(`/campaigns/${campaign.id}`)}
												>
													{campaign.id}
												</td>
												<td
													className="py-2 px-4 border-b font-medium"
													onClick={() => navigate(`/campaigns/${campaign.id}`)}
												>
													{campaign.name}
												</td>
												<td
													className="py-2 px-4 border-b"
													onClick={() => navigate(`/campaigns/${campaign.id}`)}
												>
													{campaign.created_at
														? formatDate(campaign.created_at)
														: "N/A"}
												</td>
												<td
													className="py-2 px-4 border-b"
													onClick={() => navigate(`/campaigns/${campaign.id}`)}
												>
													{campaign.updated_at
														? formatDate(campaign.updated_at)
														: "N/A"}
												</td>
												<td
													className="py-2 px-4 border-b"
													onClick={() => navigate(`/campaigns/${campaign.id}`)}
												>
													<Badge variant="secondary" className="text-white">
														{campaign.messageCount ?? 0}{" "}
														{campaign.messageCount === 1
															? "message"
															: "messages"}
													</Badge>
												</td>
												<td className="py-2 px-4 border-b">
													{campaign.hasReplyTemplate ? (
														<Badge
															variant="default"
															className="bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer transition-colors"
															onClick={async (e) => {
																e.stopPropagation();
																if (!campaign.templateId) {
																	toast.error("Template ID not found");
																	return;
																}
																try {
																	const template = await fetchTemplateById(
																		campaign.templateId,
																	);
																	setEditingTemplate(template);
																	setIsEditDialogOpen(true);
																} catch (error) {
																	console.error(
																		"Error fetching template:",
																		error,
																	);
																	toast.error("Failed to load template");
																}
															}}
														>
															{campaign.replyTemplateCount > 1
																? `${campaign.replyTemplateCount} templates (${campaign.activeReplyTemplateCount} active)`
																: "Template Exists"}
														</Badge>
													) : (
														<Badge
															variant="outline"
															className="text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors"
															onClick={(e) => {
																e.stopPropagation();
																setSelectedCampaignId(campaign.id);
																setIsCreateDialogOpen(true);
															}}
														>
															No Template
														</Badge>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<p className="text-gray-500 text-center py-8">
								No campaigns found.
							</p>
						)}
					</Suspense>
				</CardContent>
			</Card>

			{/* Create Template Dialog */}
			<AlertDialog
				open={isCreateDialogOpen}
				onOpenChange={(open) => {
					setIsCreateDialogOpen(open);
					if (!open) setSelectedCampaignId(null);
				}}
			>
				<AlertDialogContent className="!w-[90vw] !max-w-[1400px] max-h-[90vh] overflow-y-auto">
					<AlertDialogHeader className="flex flex-row items-center justify-between">
						<AlertDialogTitle>Create Reply Template</AlertDialogTitle>
						<Button
							variant="ghost"
							size="sm"
							className="h-8 w-8 p-0"
							onClick={() => {
								setIsCreateDialogOpen(false);
								setSelectedCampaignId(null);
							}}
						>
							<X className="h-4 w-4" />
						</Button>
					</AlertDialogHeader>
					<AlertDialogDescription>
						Create an automated reply template for this campaign. The template
						will be used to send responses to supporters.
					</AlertDialogDescription>
					<Suspense fallback={<LoadingSpinner />}>
						{selectedCampaignId && (
							<TemplateForm
								initialData={{ campaign_id: selectedCampaignId }}
								onSuccess={() => {
									queryClient.invalidateQueries({
										queryKey: ["campaigns-with-extras"],
									});
									setIsCreateDialogOpen(false);
									setSelectedCampaignId(null);
								}}
								onCancel={() => {
									setIsCreateDialogOpen(false);
									setSelectedCampaignId(null);
								}}
							/>
						)}
					</Suspense>
				</AlertDialogContent>
			</AlertDialog>

			{/* Edit Template Dialog */}
			<AlertDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<AlertDialogContent className="!w-[90vw] !max-w-[1400px] max-h-[90vh] overflow-y-auto">
					<AlertDialogHeader className="flex flex-row items-center justify-between">
						<AlertDialogTitle>Edit Reply Template</AlertDialogTitle>
						<Button
							variant="ghost"
							size="sm"
							className="h-8 w-8 p-0"
							onClick={() => {
								setIsEditDialogOpen(false);
								setEditingTemplate(null);
							}}
						>
							<X className="h-4 w-4" />
						</Button>
					</AlertDialogHeader>
					<AlertDialogDescription>
						Edit the automated reply template for this campaign. Changes will be
						applied to future automated responses.
					</AlertDialogDescription>
					<Suspense fallback={<LoadingSpinner />}>
						{editingTemplate && (
							<TemplateForm
								initialData={{
									...editingTemplate,
									send_timing: editingTemplate.send_timing,
									scheduled_for: editingTemplate.scheduled_for || undefined,
								}}
								onSuccess={() => {
									queryClient.invalidateQueries({
										queryKey: ["campaigns-with-extras"],
									});
									setIsEditDialogOpen(false);
									setEditingTemplate(null);
								}}
								onCancel={() => {
									setIsEditDialogOpen(false);
									setEditingTemplate(null);
								}}
							/>
						)}
					</Suspense>
				</AlertDialogContent>
			</AlertDialog>
		</PageLayout>
	);
}
