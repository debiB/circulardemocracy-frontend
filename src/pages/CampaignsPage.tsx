import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils'; // Import the new utility
import { PageLayout } from '@/components/PageLayout'; // Import PageLayout
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { TemplateForm } from '@/components/TemplateForm';
import { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { toast } from 'sonner';

// A simple spinner component for fallback within the card
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-48">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
  </div>
);

interface Campaign {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  keywords: string[] | null;
  reference_vector: number[] | null;
  vector_updated_at: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CampaignWithExtras extends Campaign {
  messageCount: number;
  hasReplyTemplate: boolean;
  templateId?: number;
}

async function fetchTemplateById(templateId: number): Promise<any> {
  const { data, error } = await supabase!
    .from('reply_templates_with_campaign')
    .select('id, campaign_id, name, subject, body, active, send_timing, scheduled_for')
    .eq('id', templateId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function fetchCampaignsWithExtras(): Promise<CampaignWithExtras[]> {
  const { data, error } = await supabase!
    .from('campaign_with_extra')
    .select(
      [
        'id',
        'name',
        'slug',
        'description',
        'keywords',
        'reference_vector',
        'vector_updated_at',
        'status',
        'created_by',
        'created_at',
        'updated_at',
        'message_count',
        'has_reply_template',
        'template_id',
      ].join(','),
    )
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = data && Array.isArray(data) ? data : [];
  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    keywords: row.keywords ?? null,
    reference_vector: row.reference_vector ?? null,
    vector_updated_at: row.vector_updated_at ?? null,
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    messageCount: row.message_count ?? 0,
    hasReplyTemplate: !!row.has_reply_template,
    templateId: row.template_id ?? undefined,
  }));
}

export function CampaignsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  
  const { data: campaigns } = useSuspenseQuery<CampaignWithExtras[], Error>({
    queryKey: ['campaigns-with-extras'],
    queryFn: fetchCampaignsWithExtras,
  });

  return (
    <PageLayout>
      <Card className="p-4">
        <CardHeader>
          <CardTitle className="text-primary">Campaigns</CardTitle>      </CardHeader>
        <CardContent>
          {campaigns && Array.isArray(campaigns) && campaigns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left">ID</th>
                    <th className="py-2 px-4 border-b text-left">Name</th>
                    <th className="py-2 px-4 border-b text-left">Created At</th>
                    <th className="py-2 px-4 border-b text-left">Updated At</th>
                    <th className="py-2 px-4 border-b text-left">Messages</th>
                    <th className="py-2 px-4 border-b text-left">Reply Template</th>
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
                        {campaign.created_at ? formatDate(campaign.created_at) : 'N/A'}
                      </td>
                      <td 
                        className="py-2 px-4 border-b"
                        onClick={() => navigate(`/campaigns/${campaign.id}`)}
                      >
                        {campaign.updated_at ? formatDate(campaign.updated_at) : 'N/A'}
                      </td>
                      <td 
                        className="py-2 px-4 border-b"
                        onClick={() => navigate(`/campaigns/${campaign.id}`)}
                      >
                        <Badge variant="secondary" className="text-white">
                          {campaign.messageCount ?? 0} {campaign.messageCount === 1 ? 'message' : 'messages'}
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
                                toast.error('Template ID not found');
                                return;
                              }
                              try {
                                const template = await fetchTemplateById(campaign.templateId);
                                setEditingTemplate(template);
                                setIsEditDialogOpen(true);
                              } catch (error) {
                                console.error('Error fetching template:', error);
                                toast.error('Failed to load template');
                              }
                            }}
                          >
                            Template Exists
                          </Badge>
                        ) : (
                          <Badge 
                            variant="outline" 
                            className="text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCampaignId(Number(campaign.id));
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
            <p className="text-gray-500 text-center py-8">No campaigns found.</p>
          )}
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
            Create an automated reply template for this campaign. The template will be used to send responses to supporters.
          </AlertDialogDescription>
          <Suspense fallback={<LoadingSpinner />}>
            {selectedCampaignId && (
              <TemplateForm
                initialData={{ campaign_id: selectedCampaignId }}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ['campaigns-with-extras'] });
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
      <AlertDialog 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen}
      >
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
            Edit the automated reply template for this campaign. Changes will be applied to future automated responses.
          </AlertDialogDescription>
          <Suspense fallback={<LoadingSpinner />}>
            {editingTemplate && (
              <TemplateForm
                initialData={editingTemplate}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ['campaigns-with-extras'] });
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
