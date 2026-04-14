import { useSuspenseQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ReplyStatus } from '@/components/ReplyStatus';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { getTimingDisplayLabel } from '@/components/SendTimingSelector';

interface Message {
  id: number;
  reply_sent_at: string | null;
  reply_template_id: number | null;
  received_at: string;
  processed_at: string;
}

interface ReplyTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  send_timing: string;
  scheduled_for: string | null;
  active: boolean;
}

interface ReplyHistoryDialogProps {
  message: Message;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function fetchTemplateDetails(templateId: number): Promise<ReplyTemplate | null> {
  try {
    const { data, error } = await supabase!
      .from('reply_templates_with_campaign')
      .select('id, name, subject, body, send_timing, scheduled_for, active')
      .eq('id', templateId)
      .single();

    if (error) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function ReplyHistoryContent({ message }: { message: Message }) {
  // Only fetch template if one is assigned
  const { data: template } = useSuspenseQuery<ReplyTemplate | null, Error>({
    queryKey: ['reply-template', message.reply_template_id],
    queryFn: () => message.reply_template_id ? fetchTemplateDetails(message.reply_template_id) : Promise.resolve(null),
  });

  return (
    <div className="space-y-6">
      {/* Reply Status Overview */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Reply Status</h3>
        <ReplyStatus 
          replySentAt={message.reply_sent_at} 
          replyTemplateId={message.reply_template_id}
          variant="detailed"
        />
      </div>

      {/* Message Timeline */}
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Timeline</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
            <div className="flex-1">
              <div className="text-sm font-medium">Message Received</div>
              <div className="text-xs text-gray-500">{formatDate(message.received_at)}</div>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
            <div className="flex-1">
              <div className="text-sm font-medium">Message Processed</div>
              <div className="text-xs text-gray-500">{formatDate(message.processed_at)}</div>
            </div>
          </div>
          
          {message.reply_template_id && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5"></div>
              <div className="flex-1">
                <div className="text-sm font-medium">Template Assigned</div>
                <div className="text-xs text-gray-500">
                  {template ? template.name : `Template #${message.reply_template_id}`}
                </div>
              </div>
            </div>
          )}
          
          {message.reply_sent_at && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
              <div className="flex-1">
                <div className="text-sm font-medium">Reply Sent</div>
                <div className="text-xs text-gray-500">{formatDate(message.reply_sent_at)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Template Details */}
      {template && (
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Template Details</h3>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-gray-500 font-medium">Template Name:</span>
              <p className="text-sm mt-1">{template.name}</p>
            </div>
            
            <div>
              <span className="text-xs text-gray-500 font-medium">Subject:</span>
              <p className="text-sm mt-1">{template.subject}</p>
            </div>
            
            <div>
              <span className="text-xs text-gray-500 font-medium">Send Timing:</span>
              <div className="mt-1">
                <Badge variant="outline" className="text-xs">
                  {getTimingDisplayLabel(template.send_timing as any, template.scheduled_for)}
                </Badge>
              </div>
            </div>
            
            <div>
              <span className="text-xs text-gray-500 font-medium">Status:</span>
              <div className="mt-1">
                <Badge variant={template.active ? 'default' : 'secondary'} className="text-xs">
                  {template.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            
            <div>
              <span className="text-xs text-gray-500 font-medium">Message Body:</span>
              <div className="mt-1 text-sm bg-white p-3 rounded border max-h-40 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-sans text-xs">
                  {template.body}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {!message.reply_template_id && !message.reply_sent_at && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-800">
            No reply has been assigned or sent for this message yet.
          </p>
        </div>
      )}
    </div>
  );
}

export function ReplyHistoryDialog({ message, open, onOpenChange }: ReplyHistoryDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Reply History - Message #{message.id}</AlertDialogTitle>
        </AlertDialogHeader>
        <ReplyHistoryContent message={message} />
      </AlertDialogContent>
    </AlertDialog>
  );
}
