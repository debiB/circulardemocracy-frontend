import { cn } from "@/lib/utils";

export interface CampaignFilterProps {
  campaigns: string[];
  selectedCampaigns: Set<string>;
  onChange: (selectedCampaigns: Set<string>) => void;
  className?: string;
}

export function CampaignFilter({
  campaigns,
  selectedCampaigns,
  onChange,
  className = "",
}: CampaignFilterProps) {
  const handleToggleCampaign = (campaign: string, checked: boolean) => {
    const newSelected = new Set(selectedCampaigns);
    if (checked) {
      newSelected.add(campaign);
    } else {
      newSelected.delete(campaign);
    }
    onChange(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onChange(new Set(campaigns));
    } else {
      onChange(new Set());
    }
  };

  const allSelected = campaigns.length > 0 && selectedCampaigns.size === campaigns.length;
  const someSelected = selectedCampaigns.size > 0 && selectedCampaigns.size < campaigns.length;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Filter by Campaign:
        </span>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(input) => {
              if (input) {
                input.indeterminate = someSelected;
              }
            }}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span>Select All</span>
        </label>
      </div>
      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
        {campaigns.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            No campaigns available
          </p>
        ) : (
          campaigns.map((campaign) => (
            <label
              key={campaign}
              className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedCampaigns.has(campaign)}
                onChange={(e) => handleToggleCampaign(campaign, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span>{campaign}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
