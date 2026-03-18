import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type SendTimingValue = 'immediate' | 'office_hours' | 'scheduled';

interface SendTimingSelectorProps {
  value: SendTimingValue;
  onValueChange: (value: SendTimingValue) => void;
  scheduledDateTime?: string;
  onScheduledDateTimeChange?: (value: string) => void;
  error?: string;
  showScheduledInput?: boolean;
}

export function SendTimingSelector({
  value,
  onValueChange,
  scheduledDateTime,
  onScheduledDateTimeChange,
  error,
  showScheduledInput = true,
}: SendTimingSelectorProps) {
  const getDescription = () => {
    switch (value) {
      case 'immediate':
        return 'Messages will be sent instantly upon receipt';
      case 'office_hours':
        return 'Messages will be sent during office hours (8:00–19:00 CEST)';
      case 'scheduled':
        return 'Messages will be sent at the scheduled date and time';
      default:
        return 'Choose when this template should be sent';
    }
  };

  return (
    <>
      <Field>
        <FieldLabel htmlFor="send_timing">Send Timing *</FieldLabel>
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="immediate">Immediate - Sent instantly</SelectItem>
            <SelectItem value="office_hours">
              Office Hours - Sent during office hours (8:00–19:00 CEST)
            </SelectItem>
            <SelectItem value="scheduled">Scheduled - Choose specific date and time</SelectItem>
          </SelectContent>
        </Select>
        <FieldDescription>{getDescription()}</FieldDescription>
        {error && <FieldError>{error}</FieldError>}
      </Field>

      {value === 'scheduled' && showScheduledInput && (
        <Field>
          <FieldLabel htmlFor="scheduled_for">Scheduled Date & Time</FieldLabel>
          <input
            id="scheduled_for"
            type="datetime-local"
            value={scheduledDateTime || ''}
            onChange={(e) => onScheduledDateTimeChange?.(e.target.value)}
            className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-white px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] focus-visible:ring-[3px] md:text-sm w-full outline-none"
          />
          <FieldDescription>
            Select the date and time when this template should be sent. Time is displayed as-is
            without timezone conversion.
            {/* TODO: Implement proper timezone handling - currently displays local browser time */}
            {/* TODO: Consider adding timezone selector or converting to/from CEST */}
          </FieldDescription>
        </Field>
      )}
    </>
  );
}

export function getTimingDisplayLabel(
  sendTiming: SendTimingValue,
  scheduledFor?: string | null
): string {
  switch (sendTiming) {
    case 'immediate':
      return 'Sent instantly';
    case 'office_hours':
      return 'Sent during office hours (8:00–19:00 CEST)';
    case 'scheduled':
      if (scheduledFor) {
        // TODO: Format with proper timezone handling
        // Currently displays the ISO datetime string as-is
        try {
          const date = new Date(scheduledFor);
          return `Scheduled for ${date.toLocaleString()}`;
        } catch {
          return `Scheduled for ${scheduledFor}`;
        }
      }
      return 'Scheduled';
    default:
      return sendTiming;
  }
}
