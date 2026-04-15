interface CampaignFilterProps {
  campaigns: string[];
  selectedCampaigns: Set<string>;
  onChange: (nextSelected: Set<string>) => void;
}

export function CampaignFilter({
  campaigns,
  selectedCampaigns,
  onChange,
}: CampaignFilterProps) {
  if (!campaigns || campaigns.length === 0) {
    return <div>No campaigns available</div>;
  }

  const allSelected = selectedCampaigns.size === campaigns.length;

  const toggleCampaign = (campaign: string) => {
    const next = new Set(selectedCampaigns);
    if (next.has(campaign)) {
      next.delete(campaign);
    } else {
      next.add(campaign);
    }
    onChange(next);
  };

  const toggleAll = () => {
    if (allSelected) {
      onChange(new Set());
    } else {
      onChange(new Set(campaigns));
    }
  };

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
        />
        <span> Select All</span>
      </label>

      <div>
        {campaigns.map((campaign) => (
          <label key={campaign}>
            <input
              type="checkbox"
              checked={selectedCampaigns.has(campaign)}
              onChange={() => toggleCampaign(campaign)}
            />
            <span> {campaign}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

