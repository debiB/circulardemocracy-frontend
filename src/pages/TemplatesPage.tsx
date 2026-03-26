import { useSuspenseQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageLayout } from '@/components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { TemplateForm } from '@/components/TemplateForm';
import { Suspense, useState } from 'react';
import { Plus, Edit, X } from 'lucide-react';
import { getTimingDisplayLabel } from '@/components/SendTimingSelector';

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-48">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
  </div>
);

interface ReplyTemplate {
  id: number;
  politician_id: number;
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

interface Campaign {
  id: number;
  name: string;
}

interface TemplateWithCampaign extends ReplyTemplate {
  campaign?: Campaign;
}

async function fetchReplyTemplates(): Promise<TemplateWithCampaign[]> {
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

  const templates: ReplyTemplate[] = await response.json();
  
  const campaignIds = [...new Set(templates.map(t => t.campaign_id))];
  
  const { data: campaigns, error } = await supabase!
    .from('campaigns')
    .select('id, name')
    .in('id', campaignIds);

  if (error) {
    throw error;
  }

  const campaignMap = new Map(campaigns?.map(c => [c.id, c]) || []);
  
  return templates.map(template => ({
    ...template,
    campaign: campaignMap.get(template.campaign_id),
  }));
}


function TemplatesList() {
  const [editingTemplate, setEditingTemplate] = useState<TemplateWithCampaign | null>(null);
  const { data: templates } = useSuspenseQuery<TemplateWithCampaign[], Error>({
    queryKey: ['reply-templates'],
    queryFn: fetchReplyTemplates,
  });

  const groupedByCampaign = templates.reduce((acc, template) => {
    const campaignId = template.campaign_id;
    if (!acc[campaignId]) {
      acc[campaignId] = {
        campaign: template.campaign,
        templates: [],
      };
    }
    acc[campaignId].templates.push(template);
    return acc;
  }, {} as Record<number, { campaign?: Campaign; templates: TemplateWithCampaign[] }>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedByCampaign).map(([campaignId, { campaign, templates: campaignTemplates }]) => (
        <Card key={campaignId}>
          <CardHeader>
            <CardTitle>{campaign?.name || `Campaign #${campaignId}`}</CardTitle>
            <CardDescription>
              {campaignTemplates.length} {campaignTemplates.length === 1 ? 'template' : 'templates'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {campaignTemplates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-base">{template.name}</h3>
                        <Badge variant={template.active ? 'default' : 'secondary'}>
                          {template.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Subject:</span> {template.subject}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Timing:</span>
                          <Badge variant="outline" className="text-xs">
                            {getTimingDisplayLabel(template.send_timing as any, template.scheduled_for)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTemplate(template)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      
      {Object.keys(groupedByCampaign).length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No reply templates found. Create your first template to get started.
          </CardContent>
        </Card>
      )}
      
      <AlertDialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <AlertDialogContent className="!w-[90vw] !max-w-[1400px] max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader className="flex flex-row items-center justify-between">
            <AlertDialogTitle>Edit Template</AlertDialogTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setEditingTemplate(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDialogHeader>
          {editingTemplate && (
            <Suspense fallback={<LoadingSpinner />}>
              <TemplateForm
                initialData={editingTemplate ? {
                  ...editingTemplate,
                  send_timing: editingTemplate.send_timing as 'immediate' | 'office_hours' | 'scheduled',
                  scheduled_for: editingTemplate.scheduled_for || undefined,
                } : undefined}
                onSuccess={() => setEditingTemplate(null)}
                onCancel={() => setEditingTemplate(null)}
              />
            </Suspense>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function TemplatesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <PageLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Reply Templates</h1>
            <p className="text-gray-600 mt-2">
              Manage your automated reply templates for different campaigns
            </p>
          </div>
          
          <AlertDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <AlertDialogHeader className="flex flex-row items-center justify-between">
                <AlertDialogTitle>Create New Template</AlertDialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </AlertDialogHeader>
              <Suspense fallback={<LoadingSpinner />}>
                <TemplateForm
                  onSuccess={() => setIsCreateDialogOpen(false)}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </Suspense>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        
        <Suspense fallback={<LoadingSpinner />}>
          <TemplatesList />
        </Suspense>
      </div>
    </PageLayout>
  );
}
