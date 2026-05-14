import { getTimingDisplayLabel } from "@/components/SendTimingSelector";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TemplatePreviewProps {
  subject: string;
  body: string;
  sendTiming: string;
  scheduledFor?: string | null;
  personalizationData?: {
    name?: string;
    campaign?: string;
  };
}

/**
 * Simple variable substitution for template personalization
 * Supports: {name}, {campaign}
 *
 * TODO: Add more variables as needed (e.g., {politician}, {date})
 * TODO: Consider adding fallback values for missing data
 */
function substituteVariables(
  text: string,
  data: { name?: string; campaign?: string },
): string {
  let result = text;

  // Replace {name} with actual name or placeholder
  if (data.name) {
    result = result.replace(/{name}/g, data.name);
  } else {
    result = result.replace(/{name}/g, "[Name]");
  }

  // Replace {campaign} with actual campaign or placeholder
  if (data.campaign) {
    result = result.replace(/{campaign}/g, data.campaign);
  } else {
    result = result.replace(/{campaign}/g, "[Campaign]");
  }

  return result;
}

/**
 * Simple markdown to HTML converter
 * Supports basic markdown: **bold**, *italic*, [links](url), line breaks
 *
 * NOTE: This is a simple implementation. For production, consider using a proper
 * markdown library like react-markdown or marked.
 *
 * TODO: Add support for lists, headings, code blocks if needed
 */
function simpleMarkdownToHtml(markdown: string): string {
  let html = markdown;

  // Convert **bold** to <strong>
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Convert *italic* to <em>
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Convert [text](url) to <a>
  html = html.replace(
    /\[(.+?)\]\((.+?)\)/g,
    '<a href="$2" class="text-blue-600 underline" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  // Convert line breaks to <br>
  html = html.replace(/\n/g, "<br>");

  return html;
}

export function TemplatePreview({
  subject,
  body,
  sendTiming,
  scheduledFor,
  personalizationData = {},
}: TemplatePreviewProps) {
  // Apply variable substitution
  const personalizedSubject = substituteVariables(subject, personalizationData);
  const personalizedBody = substituteVariables(body, personalizationData);

  // Convert markdown to HTML
  const htmlBody = simpleMarkdownToHtml(personalizedBody);

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Template Preview</CardTitle>
          <Badge variant="outline" className="text-xs">
            {getTimingDisplayLabel(sendTiming as any, scheduledFor)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subject Preview */}
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Subject:</div>
          <div className="bg-gray-50 border rounded p-3 text-sm font-medium">
            {personalizedSubject}
          </div>
        </div>

        {/* Body Preview */}
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">
            Message Body:
          </div>
          <div
            className="bg-white border rounded p-4 text-sm min-h-[200px] prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlBody }}
          />
        </div>

        {/* Personalization Info */}
        {(personalizationData.name || personalizationData.campaign) && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <div className="text-xs font-medium text-blue-800 mb-2">
              Personalization Applied:
            </div>
            <div className="space-y-1 text-xs text-blue-700">
              {personalizationData.name && (
                <div>
                  • Name:{" "}
                  <span className="font-medium">
                    {personalizationData.name}
                  </span>
                </div>
              )}
              {personalizationData.campaign && (
                <div>
                  • Campaign:{" "}
                  <span className="font-medium">
                    {personalizationData.campaign}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {!personalizationData.name && !personalizationData.campaign && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <div className="text-xs text-yellow-800">
              No personalization data provided. Variables like {"{name}"} and{" "}
              {"{campaign}"} will show as placeholders.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact preview variant for inline display
 */
export function TemplatePreviewCompact({
  subject,
  body,
  personalizationData = {},
}: Pick<TemplatePreviewProps, "subject" | "body" | "personalizationData">) {
  const personalizedSubject = substituteVariables(subject, personalizationData);
  const personalizedBody = substituteVariables(body, personalizationData);
  const htmlBody = simpleMarkdownToHtml(personalizedBody);

  return (
    <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
      <div>
        <span className="text-xs text-gray-500 font-medium">Subject: </span>
        <span className="text-sm">{personalizedSubject}</span>
      </div>
      <div>
        <span className="text-xs text-gray-500 font-medium">
          Body Preview:{" "}
        </span>
        <div
          className="text-xs mt-1 line-clamp-3"
          dangerouslySetInnerHTML={{ __html: htmlBody }}
        />
      </div>
    </div>
  );
}

/**
 * Helper to extract variables from template text
 * Returns array of variable names found in the text
 */
export function extractTemplateVariables(text: string): string[] {
  const matches = text.match(/{(\w+)}/g);
  if (!matches) return [];

  return [...new Set(matches.map((m) => m.slice(1, -1)))];
}

/**
 * Helper to validate if all variables in template have data
 */
export function validateTemplateVariables(
  text: string,
  data: Record<string, string | undefined>,
): { valid: boolean; missing: string[] } {
  const variables = extractTemplateVariables(text);
  const missing = variables.filter((v) => !data[v]);

  return {
    valid: missing.length === 0,
    missing,
  };
}
