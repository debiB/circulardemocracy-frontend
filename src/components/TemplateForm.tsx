import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SendTimingSelector, type SendTimingValue } from '@/components/SendTimingSelector';
import { TemplatePreview } from '@/components/TemplatePreview';
import { useState } from 'react';
import { toast } from 'sonner';

interface Campaign {
  id: number;
  name: string;
}

interface TemplateFormData {
  politician_id: number;
  campaign_id: number;
  name: string;
  subject: string;
  body: string;
  send_timing: SendTimingValue;
  scheduled_for?: string;
  active: boolean;
}

interface TemplateFormProps {
  initialData?: Partial<TemplateFormData> & { id?: number };
  onSuccess?: () => void;
  onCancel?: () => void;
}

async function fetchCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase!.from('campaigns').select('id, name').order('name');
  if (error) throw error;
  return data || [];
}

async function createTemplate(templateData: Omit<TemplateFormData, 'active'>): Promise<any> {
  const { data: { session } } = await supabase!.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/reply-templates`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(templateData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to create template');
  }

  return response.json();
}

export function TemplateForm({ initialData, onSuccess, onCancel }: TemplateFormProps) {
  const queryClient = useQueryClient();
  const isEditMode = !!initialData?.id;
  
  const { data: campaigns } = useSuspenseQuery<Campaign[], Error>({
    queryKey: ['campaigns'],
    queryFn: fetchCampaigns,
  });

  const [sendTiming, setSendTiming] = useState<SendTimingValue>(initialData?.send_timing || 'immediate');
  const [showPreview, setShowPreview] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<TemplateFormData>({
    defaultValues: {
      name: initialData?.name || '',
      subject: initialData?.subject || '',
      body: initialData?.body || '',
      campaign_id: initialData?.campaign_id,
      politician_id: initialData?.politician_id || 1, // TODO: Get actual politician_id from current user
      send_timing: initialData?.send_timing || 'immediate',
      scheduled_for: initialData?.scheduled_for || '',
      active: initialData?.active ?? true,
    },
  });

  const createMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reply-templates'] });
      toast.success(isEditMode ? 'Template updated successfully' : 'Template created successfully');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save template');
    },
  });

  const onSubmit = async (data: TemplateFormData) => {
    if (isEditMode) {
      toast.error('Update endpoint not available - only create is supported');
      return;
    }

    const { active, ...templateData } = data;
    
    if (data.send_timing !== 'scheduled') {
      delete templateData.scheduled_for;
    }

    await createMutation.mutateAsync(templateData);
  };

  const activeValue = watch('active');
  const subjectValue = watch('subject');
  const bodyValue = watch('body');
  const campaignIdValue = watch('campaign_id');
  
  const selectedCampaign = campaigns.find(c => c.id === campaignIdValue);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="campaign_id">Campaign *</FieldLabel>
          <Select
            value={watch('campaign_id')?.toString()}
            onValueChange={(value) => setValue('campaign_id', parseInt(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id.toString()}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.campaign_id && <FieldError>{errors.campaign_id.message}</FieldError>}
        </Field>

        <Input
          label="Template Name *"
          {...register('name', { required: 'Template name is required' })}
          errorMessage={errors.name?.message}
          placeholder="e.g., Standard Reply"
        />
      </div>

      <Input
        label="Subject Line *"
        {...register('subject', { required: 'Subject is required' })}
        errorMessage={errors.subject?.message}
        placeholder="e.g., Thank you for your message"
      />

      <Field>
        <FieldLabel htmlFor="body">Message Body (Markdown) *</FieldLabel>
        <Textarea
          id="body"
          {...register('body', { required: 'Message body is required' })}
          placeholder="Write your template message here. You can use Markdown formatting."
          rows={10}
          className="font-mono text-sm"
        />
        <FieldDescription>
          Use Markdown syntax for formatting (e.g., **bold**, *italic*, [links](url))
        </FieldDescription>
        {errors.body && <FieldError>{errors.body.message}</FieldError>}
      </Field>

      <SendTimingSelector
        value={sendTiming}
        onValueChange={(value) => {
          setSendTiming(value);
          setValue('send_timing', value);
        }}
        scheduledDateTime={watch('scheduled_for')}
        onScheduledDateTimeChange={(value) => setValue('scheduled_for', value)}
        error={errors.scheduled_for?.message}
      />

      <Field orientation="horizontal">
        <div className="flex items-center gap-2">
          <input
            id="active"
            type="checkbox"
            {...register('active')}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <FieldLabel htmlFor="active" className="mb-0">
            Active
          </FieldLabel>
        </div>
        <FieldDescription>
          {activeValue ? 'This template is active and can be used' : 'This template is inactive'}
        </FieldDescription>
      </Field>

      {/* Preview Toggle */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-sm font-medium text-primary hover:underline"
        >
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>
      </div>

      {/* Live Preview */}
      {showPreview && subjectValue && bodyValue && (
        <TemplatePreview
          subject={subjectValue}
          body={bodyValue}
          sendTiming={sendTiming}
          scheduledFor={watch('scheduled_for')}
          personalizationData={{
            name: 'John Doe',
            campaign: selectedCampaign?.name || 'Sample Campaign',
          }}
        />
      )}

      <div className="flex gap-3 justify-end pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
          {isSubmitting || createMutation.isPending
            ? 'Saving...'
            : isEditMode
            ? 'Update Template'
            : 'Create Template'}
        </Button>
      </div>
    </form>
  );
}
