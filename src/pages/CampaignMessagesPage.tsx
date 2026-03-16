import { useSuspenseQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import { PageLayout } from '@/components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// TODO: Product Decision Required - Sender Identity Display
// Current implementation shows sender_hash (first 8 chars) for privacy.
// Unanswered questions:
// - Should we display partial email instead?
// - Should we show full hash or anonymized label like "Sender #123"?
// - What level of sender information is acceptable for politicians to see?

// TODO: Product Decision Required - Message Content Display
// Current implementation does NOT display message content (subject/body).
// Unanswered questions:
// - Should we display full message content or just summaries?
// - Should content be retrieved on-demand via JMAP?
// - What privacy considerations apply to message content display?

// TODO: Product Decision Required - Filtering Criteria
// No filtering implemented yet.
// Unanswered questions:
// - Which filtering criteria are most important? (date range, duplicate status, confidence level?)
// - Should filters be client-side or require backend support?
// - What are the primary use cases for filtering messages?

interface Campaign {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  status: string;
}

interface Message {
  id: number;
  sender_hash: string;
  sender_country: string | null;
  duplicate_rank: number;
  classification_confidence: number;
  language: string;
  received_at: string;
  processed_at: string;
  reply_sent_at: string | null;
  processing_status: string;
}

async function fetchCampaign(campaignId: string): Promise<Campaign> {
  const { data, error } = await supabase!
    .from('campaigns')
    .select('id, name, slug, description, status')
    .eq('id', campaignId)
    .single();

  if (error) {
    throw error;
  }
  return data;
}

async function fetchCampaignMessages(campaignId: string): Promise<Message[]> {
  // TODO: Pagination - No pagination implemented yet
  // Current implementation fetches all messages for the campaign.
  // Consider implementing pagination using .range() when requirements are clarified.
  // Questions to answer:
  // - What page size is appropriate?
  // - Should we use offset-based or cursor-based pagination?
  
  const { data, error } = await supabase!
    .from('messages')
    .select('id, sender_hash, sender_country, duplicate_rank, classification_confidence, language, received_at, processed_at, reply_sent_at, processing_status')
    .eq('campaign_id', campaignId)
    .order('received_at', { ascending: false });

  if (error) {
    throw error;
  }
  return data;
}

export function CampaignMessagesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return (
      <PageLayout>
        <Card className="p-4">
          <CardContent>
            <p className="text-red-500">Invalid campaign ID</p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const { data: campaign } = useSuspenseQuery<Campaign, Error>({
    queryKey: ['campaign', id],
    queryFn: () => fetchCampaign(id),
  });

  const { data: messages } = useSuspenseQuery<Message[], Error>({
    queryKey: ['campaign-messages', id],
    queryFn: () => fetchCampaignMessages(id),
  });

  // TODO: CSV Export - Placeholder action
  // Product decision required on export requirements:
  // - What fields should be included in the export?
  // - Should exports include PII or remain privacy-safe?
  // - Should export be client-side or server-side?
  const handleExport = () => {
    // Placeholder for CSV export functionality
    alert('CSV export functionality not yet implemented. Product requirements needed.');
  };

  return (
    <PageLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/campaigns')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Campaigns
          </Button>
          <Button onClick={handleExport} variant="outline">
            Export CSV
          </Button>
        </div>

        <Card className="p-4">
          <CardHeader>
            <CardTitle className="text-primary">
              {campaign.name} - Messages
            </CardTitle>
            {campaign.description && (
              <p className="text-sm text-gray-600 mt-2">{campaign.description}</p>
            )}
            <div className="text-sm text-gray-500 mt-2">
              Status: <span className="font-medium">{campaign.status}</span> | 
              Total Messages: <span className="font-medium">{messages.length}</span>
            </div>
          </CardHeader>
          <CardContent>
            {messages && messages.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b text-left">Sender ID</th>
                      <th className="py-2 px-4 border-b text-left">Country</th>
                      <th className="py-2 px-4 border-b text-left">Received</th>
                      <th className="py-2 px-4 border-b text-left">Confidence</th>
                      <th className="py-2 px-4 border-b text-left">Duplicate</th>
                      <th className="py-2 px-4 border-b text-left">Language</th>
                      <th className="py-2 px-4 border-b text-left">Status</th>
                      <th className="py-2 px-4 border-b text-left">Reply Sent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((message) => (
                      <tr 
                        key={message.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="py-2 px-4 border-b font-mono text-xs">
                          {/* TODO: Sender display format - using first 8 chars of hash for now */}
                          {message.sender_hash.substring(0, 8)}...
                        </td>
                        <td className="py-2 px-4 border-b">
                          {message.sender_country || '-'}
                        </td>
                        <td className="py-2 px-4 border-b">
                          {formatDate(message.received_at)}
                        </td>
                        <td className="py-2 px-4 border-b">
                          <span className={`px-2 py-1 rounded text-xs ${
                            message.classification_confidence >= 0.7 
                              ? 'bg-green-100 text-green-800' 
                              : message.classification_confidence >= 0.4
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {(message.classification_confidence * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-2 px-4 border-b">
                          {message.duplicate_rank === 0 ? (
                            <span className="text-green-600 font-medium">Original</span>
                          ) : (
                            <span className="text-gray-500">Dup #{message.duplicate_rank}</span>
                          )}
                        </td>
                        <td className="py-2 px-4 border-b uppercase text-xs">
                          {message.language}
                        </td>
                        <td className="py-2 px-4 border-b">
                          <span className={`px-2 py-1 rounded text-xs ${
                            message.processing_status === 'processed'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {message.processing_status}
                          </span>
                        </td>
                        <td className="py-2 px-4 border-b">
                          {message.reply_sent_at ? (
                            <span className="text-green-600">
                              {formatDate(message.reply_sent_at)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No messages found for this campaign.</p>
            )}
          </CardContent>
        </Card>

        {/* TODO: Message Preview/Detail Panel
            Product decision required:
            - Should clicking a message row show a preview panel?
            - What information should be displayed in the preview?
            - Should full message content be fetched on-demand via JMAP?
            - Privacy considerations for displaying message content?
        */}
      </div>
    </PageLayout>
  );
}
