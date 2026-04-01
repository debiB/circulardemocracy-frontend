import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { CampaignFilter } from "@/components/filters/CampaignFilter";

describe("CampaignFilter", () => {
  const mockCampaigns = ["Campaign A", "Campaign B", "Campaign C"];
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it("renders the filter component", () => {
    render(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={new Set()}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText("Filter by Campaign:")).toBeInTheDocument();
  });

  it("displays all campaign checkboxes", () => {
    render(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={new Set()}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText("Campaign A")).toBeInTheDocument();
    expect(screen.getByText("Campaign B")).toBeInTheDocument();
    expect(screen.getByText("Campaign C")).toBeInTheDocument();
  });

  it("renders Select All checkbox", () => {
    render(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={new Set()}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText("Select All")).toBeInTheDocument();
  });

  it("checks selected campaigns", () => {
    const selected = new Set(["Campaign A", "Campaign C"]);
    const { container } = render(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={selected}
        onChange={mockOnChange}
      />
    );

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const campaignCheckboxes = Array.from(checkboxes).slice(1);

    expect(campaignCheckboxes[0]).toBeChecked();
    expect(campaignCheckboxes[1]).not.toBeChecked();
    expect(campaignCheckboxes[2]).toBeChecked();
  });

  it("calls onChange when campaign is checked", () => {
    render(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={new Set()}
        onChange={mockOnChange}
      />
    );

    const campaignACheckbox = screen.getByText("Campaign A").previousElementSibling as HTMLInputElement;
    fireEvent.click(campaignACheckbox);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const calledWith = mockOnChange.mock.calls[0][0];
    expect(calledWith).toBeInstanceOf(Set);
    expect(calledWith.has("Campaign A")).toBe(true);
  });

  it("calls onChange when campaign is unchecked", () => {
    const selected = new Set(["Campaign A", "Campaign B"]);
    render(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={selected}
        onChange={mockOnChange}
      />
    );

    const campaignACheckbox = screen.getByText("Campaign A").previousElementSibling as HTMLInputElement;
    fireEvent.click(campaignACheckbox);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const calledWith = mockOnChange.mock.calls[0][0];
    expect(calledWith).toBeInstanceOf(Set);
    expect(calledWith.has("Campaign A")).toBe(false);
    expect(calledWith.has("Campaign B")).toBe(true);
  });

  it("selects all campaigns when Select All is checked", () => {
    render(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={new Set()}
        onChange={mockOnChange}
      />
    );

    const selectAllCheckbox = screen.getByText("Select All").previousElementSibling as HTMLInputElement;
    fireEvent.click(selectAllCheckbox);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const calledWith = mockOnChange.mock.calls[0][0];
    expect(calledWith).toBeInstanceOf(Set);
    expect(calledWith.size).toBe(3);
    expect(calledWith.has("Campaign A")).toBe(true);
    expect(calledWith.has("Campaign B")).toBe(true);
    expect(calledWith.has("Campaign C")).toBe(true);
  });

  it("deselects all campaigns when Select All is unchecked", () => {
    const selected = new Set(mockCampaigns);
    render(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={selected}
        onChange={mockOnChange}
      />
    );

    const selectAllCheckbox = screen.getByText("Select All").previousElementSibling as HTMLInputElement;
    fireEvent.click(selectAllCheckbox);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const calledWith = mockOnChange.mock.calls[0][0];
    expect(calledWith).toBeInstanceOf(Set);
    expect(calledWith.size).toBe(0);
  });

  it("checks Select All when all campaigns are selected", () => {
    const selected = new Set(mockCampaigns);
    render(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={selected}
        onChange={mockOnChange}
      />
    );

    const selectAllCheckbox = screen.getByText("Select All").previousElementSibling as HTMLInputElement;
    expect(selectAllCheckbox).toBeChecked();
  });

  it("does not check Select All when no campaigns are selected", () => {
    render(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={new Set()}
        onChange={mockOnChange}
      />
    );

    const selectAllCheckbox = screen.getByText("Select All").previousElementSibling as HTMLInputElement;
    expect(selectAllCheckbox).not.toBeChecked();
  });

  it("sets indeterminate state when some campaigns are selected", () => {
    const selected = new Set(["Campaign A"]);
    render(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={selected}
        onChange={mockOnChange}
      />
    );

    const selectAllCheckbox = screen.getByText("Select All").previousElementSibling as HTMLInputElement;
    expect(selectAllCheckbox.indeterminate).toBe(true);
  });

  it("handles empty campaigns list", () => {
    render(
      <CampaignFilter
        campaigns={[]}
        selectedCampaigns={new Set()}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText("No campaigns available")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={new Set()}
        onChange={mockOnChange}
        className="custom-class"
      />
    );

    const filterDiv = container.querySelector(".custom-class");
    expect(filterDiv).toBeInTheDocument();
  });

  it("maintains controlled component pattern", () => {
    const { rerender } = render(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={new Set(["Campaign A"])}
        onChange={mockOnChange}
      />
    );

    let campaignACheckbox = screen.getByText("Campaign A").previousElementSibling as HTMLInputElement;
    expect(campaignACheckbox).toBeChecked();

    rerender(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={new Set()}
        onChange={mockOnChange}
      />
    );

    campaignACheckbox = screen.getByText("Campaign A").previousElementSibling as HTMLInputElement;
    expect(campaignACheckbox).not.toBeChecked();
  });

  it("handles single campaign", () => {
    render(
      <CampaignFilter
        campaigns={["Campaign A"]}
        selectedCampaigns={new Set()}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText("Campaign A")).toBeInTheDocument();
    expect(screen.queryByText("Campaign B")).not.toBeInTheDocument();
  });

  it("displays scrollable list for many campaigns", () => {
    const manyCampaigns = Array.from({ length: 20 }, (_, i) => `Campaign ${i + 1}`);
    render(
      <CampaignFilter
        campaigns={manyCampaigns}
        selectedCampaigns={new Set()}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText("Campaign 1")).toBeInTheDocument();
    expect(screen.getByText("Campaign 20")).toBeInTheDocument();
  });

  it("toggles multiple campaigns independently", () => {
    const { rerender } = render(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={new Set()}
        onChange={mockOnChange}
      />
    );

    const campaignACheckbox = screen.getByText("Campaign A").previousElementSibling as HTMLInputElement;
    fireEvent.click(campaignACheckbox);

    let calledWith = mockOnChange.mock.calls[0][0];
    expect(calledWith.has("Campaign A")).toBe(true);

    rerender(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={calledWith}
        onChange={mockOnChange}
      />
    );

    const campaignBCheckbox = screen.getByText("Campaign B").previousElementSibling as HTMLInputElement;
    fireEvent.click(campaignBCheckbox);

    calledWith = mockOnChange.mock.calls[1][0];
    expect(calledWith.has("Campaign A")).toBe(true);
    expect(calledWith.has("Campaign B")).toBe(true);
  });

  it("provides hover feedback on campaign items", () => {
    const { container } = render(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={new Set()}
        onChange={mockOnChange}
      />
    );

    const campaignLabels = container.querySelectorAll('label[class*="hover:bg-gray"]');
    expect(campaignLabels.length).toBeGreaterThan(0);
  });

  it("supports dark mode styling", () => {
    const { container } = render(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={new Set()}
        onChange={mockOnChange}
      />
    );

    const darkModeElements = container.querySelectorAll('[class*="dark:"]');
    expect(darkModeElements.length).toBeGreaterThan(0);
  });

  it("preserves unselected campaigns when toggling", () => {
    const selected = new Set(["Campaign B", "Campaign C"]);
    render(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={selected}
        onChange={mockOnChange}
      />
    );

    const campaignACheckbox = screen.getByText("Campaign A").previousElementSibling as HTMLInputElement;
    fireEvent.click(campaignACheckbox);

    const calledWith = mockOnChange.mock.calls[0][0];
    expect(calledWith.has("Campaign A")).toBe(true);
    expect(calledWith.has("Campaign B")).toBe(true);
    expect(calledWith.has("Campaign C")).toBe(true);
  });
});
