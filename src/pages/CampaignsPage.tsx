import { useSuspenseQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils'; // Import the new utility
import { PageLayout } from '@/components/PageLayout'; // Import PageLayout
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TemplateForm } from '@/components/TemplateForm';
import { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, MoreHorizontal } from 'lucide-react';

// A simple spinner component for fallback within the card
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-48">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
  </div>
);

interface Campaign {
  id: string;
  name: string;
  created_at: string;
  updated_at: string; // Assuming 'updated_at' for modified_at
  // Add other campaign properties as needed
}

interface CampaignWithExtras extends Campaign {
  hasReplyTemplate: boolean;
  messageCount: number;
}

interface ReplyTemplate {
  id: number;
  campaign_id: number;
  name: string;
  subject: string;
  body: string;
  active: boolean;
  send_timing: string;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase!.from('campaigns').select('*');
  if (error) {
    throw error; // Throw error for Suspense ErrorBoundary
  }
  return data;
}

async function fetchReplyTemplates(): Promise<ReplyTemplate[]> {
  const { data: { session } } = await supabase!.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/reply-templates`, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch reply templates');
  }

  return response.json();
}

async function fetchCampaignMessageCounts(): Promise<Record<string, number>> {
  // Get message counts per campaign
  // Since Supabase doesn't support group() directly, we'll get all messages and count them
  const { data: allMessages, error: messagesError } = await supabase!
    .from('messages')
    .select('campaign_id');
    
  if (messagesError) {
    throw messagesError;
  }
  
  // Count messages per campaign
  const counts: Record<string, number> = {};
  allMessages?.forEach(message => {
    const campaignId = message.campaign_id.toString();
    counts[campaignId] = (counts[campaignId] || 0) + 1;
  });
  
  return counts;
}

async function fetchCampaignsWithExtras(): Promise<CampaignWithExtras[]> {
  // Fetch campaigns, templates, and message counts in parallel
  const [campaigns, replyTemplates, messageCounts] = await Promise.all([
    fetchCampaigns(),
    fetchReplyTemplates(),
    fetchCampaignMessageCounts()
  ]);
  
  // Create a map of campaign_id to template existence
  const templateMap = new Map<number, boolean>();
  replyTemplates.forEach(template => {
    templateMap.set(template.campaign_id, true);
  });
  
  // Combine the data
  return campaigns.map(campaign => ({
    ...campaign,
    hasReplyTemplate: templateMap.has(parseInt(campaign.id)) || false,
    messageCount: messageCounts[campaign.id] || 0
  }));
}

export function CampaignsPage() {
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  
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
          <Suspense fallback={<LoadingSpinner />}>
            {campaigns && campaigns.length > 0 ? (
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
                      <th className="py-2 px-4 border-b text-left">Actions</th>
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
                          {formatDate(campaign.created_at)}
                        </td>
                        <td 
                          className="py-2 px-4 border-b"
                          onClick={() => navigate(`/campaigns/${campaign.id}`)}
                        >
                          {formatDate(campaign.updated_at)}
                        </td>
                        <td 
                          className="py-2 px-4 border-b"
                          onClick={() => navigate(`/campaigns/${campaign.id}`)}
                        >
                          <Badge variant="secondary" className="text-white">
                            {campaign.messageCount} {campaign.messageCount === 1 ? 'message' : 'messages'}
                          </Badge>
                        </td>
                        <td 
                          className="py-2 px-4 border-b"
                          onClick={() => navigate(`/campaigns/${campaign.id}`)}
                        >
                          {campaign.hasReplyTemplate ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
                              Template Exists
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500">
                              No Template
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 px-4 border-b">
                          {!campaign.hasReplyTemplate && (
                            <AlertDialog 
                            open={isCreateDialogOpen && selectedCampaignId === parseInt(campaign.id)} 
                            onOpenChange={(open) => {
                              setIsCreateDialogOpen(open);
                              if (!open) setSelectedCampaignId(null);
                            }}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-auto min-w-[160px]">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCampaignId(parseInt(campaign.id));
                                    setIsCreateDialogOpen(true);
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Create Reply Template
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                                <Suspense fallback={<LoadingSpinner />}>
                                  <TemplateForm
                                    initialData={{ campaign_id: parseInt(campaign.id) }}
                                    onSuccess={() => {
                                      setIsCreateDialogOpen(false);
                                      setSelectedCampaignId(null);
                                    }}
                                    onCancel={() => {
                                      setIsCreateDialogOpen(false);
                                      setSelectedCampaignId(null);
                                    }}
                                  />
                                </Suspense>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No campaigns found.</p>
            )}
          </Suspense>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
