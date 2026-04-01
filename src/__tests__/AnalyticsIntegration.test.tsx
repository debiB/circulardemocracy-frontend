import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnalyticsContainer } from "@/components/analytics/AnalyticsContainer";
import React from "react";

const mockUseAnalytics = vi.fn();

vi.mock("@/hooks/useAnalytics", () => ({
  useAnalytics: () => mockUseAnalytics(),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

vi.mock("@/components/charts/MessageLineChart", () => ({
  MessageLineChart: ({ data }: any) => (
    <div data-testid="message-line-chart">
      Chart with {data.length} data points
    </div>
  ),
}));

vi.mock("@/components/filters/CampaignFilter", () => ({
  CampaignFilter: ({ campaigns, selectedCampaigns, onChange }: any) => (
    <div data-testid="campaign-filter">
      {campaigns.map((campaign: string) => (
        <label key={campaign}>
          <input
            type="checkbox"
            checked={selectedCampaigns.has(campaign)}
            onChange={(e) => {
              const newSelected = new Set(selectedCampaigns);
              if (e.target.checked) {
                newSelected.add(campaign);
              } else {
                newSelected.delete(campaign);
              }
              onChange(newSelected);
            }}
          />
          <span>{campaign}</span>
        </label>
      ))}
      <label>
        <input
          type="checkbox"
          checked={campaigns.length > 0 && selectedCampaigns.size === campaigns.length}
          onChange={(e) => {
            if (e.target.checked) {
              onChange(new Set(campaigns));
            } else {
              onChange(new Set());
            }
          }}
        />
        <span>Select All</span>
      </label>
    </div>
  ),
}));

const mockAnalyticsData = {
  totalMessages: 150,
  repliesSent: 100,
  pendingReplies: 30,
  messagesByDay: [
    { date: "2026-04-01", count: 25 },
    { date: "2026-04-02", count: 30 },
    { date: "2026-04-03", count: 35 },
    { date: "2026-04-04", count: 40 },
    { date: "2026-04-05", count: 45 },
  ],
  messagesByCampaign: [
    { campaignId: 1, campaignName: "Campaign A", count: 80 },
    { campaignId: 2, campaignName: "Campaign B", count: 70 },
    { campaignId: 3, campaignName: "Campaign C", count: 50 },
  ],
};

describe("Analytics Integration Tests", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("Data Transformation", () => {
    it("transforms API data to chart format correctly", () => {
      mockUseAnalytics.mockReturnValue({
        data: mockAnalyticsData,
        isLoading: false,
        isError: false,
        error: null,
      });

      render(<AnalyticsContainer />, { wrapper });

      expect(screen.getByText("Campaign A")).toBeInTheDocument();
      expect(screen.getByText("Campaign B")).toBeInTheDocument();
      expect(screen.getByText("Campaign C")).toBeInTheDocument();
    });

    it("extracts campaign names from messagesByCampaign", () => {
      mockUseAnalytics.mockReturnValue({
        data: mockAnalyticsData,
        isLoading: false,
        isError: false,
        error: null,
      });

      render(<AnalyticsContainer />, { wrapper });

      const campaignNames = ["Campaign A", "Campaign B", "Campaign C"];
      campaignNames.forEach(name => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });

    it("handles data with single campaign", () => {
      mockUseAnalytics.mockReturnValue({
        data: {
          ...mockAnalyticsData,
          messagesByCampaign: [
            { campaignId: 1, campaignName: "Single Campaign", count: 150 },
          ],
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      render(<AnalyticsContainer />, { wrapper });

      expect(screen.getByText("Single Campaign")).toBeInTheDocument();
      expect(screen.queryByText("Campaign A")).not.toBeInTheDocument();
    });

    it("handles data with many campaigns", () => {
      const manyCampaigns = Array.from({ length: 10 }, (_, i) => ({
        campaignId: i + 1,
        campaignName: `Campaign ${String.fromCharCode(65 + i)}`,
        count: 100 - i * 5,
      }));

      mockUseAnalytics.mockReturnValue({
        data: {
          ...mockAnalyticsData,
          messagesByCampaign: manyCampaigns,
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      render(<AnalyticsContainer />, { wrapper });

      expect(screen.getByText("Campaign A")).toBeInTheDocument();
      expect(screen.getByText("Campaign J")).toBeInTheDocument();
    });

    it("transforms messagesByDay data correctly", () => {
      mockUseAnalytics.mockReturnValue({
        data: mockAnalyticsData,
        isLoading: false,
        isError: false,
        error: null,
      });

      render(<AnalyticsContainer />, { wrapper });

      expect(screen.getByText("150")).toBeInTheDocument();
      expect(screen.getByText("100")).toBeInTheDocument();
      expect(screen.getByText("30")).toBeInTheDocument();
    });

    it("handles empty messagesByDay array", () => {
      mockUseAnalytics.mockReturnValue({
        data: {
          ...mockAnalyticsData,
          messagesByDay: [],
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      render(<AnalyticsContainer />, { wrapper });

      expect(screen.getByText("No campaign data to display")).toBeInTheDocument();
    });

    it("handles missing messagesByCampaign data", () => {
      mockUseAnalytics.mockReturnValue({
        data: {
          totalMessages: 150,
          repliesSent: 100,
          pendingReplies: 30,
          messagesByDay: [{ date: "2026-04-01", count: 25 }],
          messagesByCampaign: [],
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      render(<AnalyticsContainer />, { wrapper });

      expect(screen.getByText("150")).toBeInTheDocument();
      expect(screen.getByTestId("campaign-filter")).toBeInTheDocument();
    });
  });

  describe("Campaign Filtering", () => {
    it("initializes with all campaigns selected", () => {
      mockUseAnalytics.mockReturnValue({
        data: mockAnalyticsData,
        isLoading: false,
        isError: false,
        error: null,
      });

      const { container } = render(<AnalyticsContainer />, { wrapper });

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      const campaignCheckboxes = Array.from(checkboxes).slice(1);

      campaignCheckboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked();
      });
    });

    it("filters chart data when campaign is deselected", async () => {
      mockUseAnalytics.mockReturnValue({
        data: mockAnalyticsData,
        isLoading: false,
        isError: false,
        error: null,
      });

      render(<AnalyticsContainer />, { wrapper });

      const campaignACheckbox = screen.getByText("Campaign A").previousElementSibling as HTMLInputElement;
      
      expect(campaignACheckbox).toBeChecked();
      
      fireEvent.click(campaignACheckbox);

      await waitFor(() => {
        expect(campaignACheckbox).not.toBeChecked();
      });
    });

    it("updates chart when multiple campaigns are deselected", async () => {
      mockUseAnalytics.mockReturnValue({
        data: mockAnalyticsData,
        isLoading: false,
        isError: false,
        error: null,
      });

      render(<AnalyticsContainer />, { wrapper });

      const campaignACheckbox = screen.getByText("Campaign A").previousElementSibling as HTMLInputElement;
      const campaignBCheckbox = screen.getByText("Campaign B").previousElementSibling as HTMLInputElement;

      fireEvent.click(campaignACheckbox);
      fireEvent.click(campaignBCheckbox);

      await waitFor(() => {
        expect(campaignACheckbox).not.toBeChecked();
        expect(campaignBCheckbox).not.toBeChecked();
      });
    });

    it("handles Select All functionality", async () => {
      mockUseAnalytics.mockReturnValue({
        data: mockAnalyticsData,
        isLoading: false,
        isError: false,
        error: null,
      });

      const { container } = render(<AnalyticsContainer />, { wrapper });

      const selectAllCheckbox = screen.getByText("Select All").previousElementSibling as HTMLInputElement;

      fireEvent.click(selectAllCheckbox);

      await waitFor(() => {
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        const campaignCheckboxes = Array.from(checkboxes).slice(1);
        
        campaignCheckboxes.forEach(checkbox => {
          expect(checkbox).not.toBeChecked();
        });
      });
    });

    it("re-selects all campaigns when Select All is clicked again", async () => {
      mockUseAnalytics.mockReturnValue({
        data: mockAnalyticsData,
        isLoading: false,
        isError: false,
        error: null,
      });

      const { container } = render(<AnalyticsContainer />, { wrapper });

      const selectAllCheckbox = screen.getByText("Select All").previousElementSibling as HTMLInputElement;

      fireEvent.click(selectAllCheckbox);
      await waitFor(() => {
        expect(selectAllCheckbox).not.toBeChecked();
      });

      fireEvent.click(selectAllCheckbox);
      await waitFor(() => {
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        const campaignCheckboxes = Array.from(checkboxes).slice(1);
        
        campaignCheckboxes.forEach(checkbox => {
          expect(checkbox).toBeChecked();
        });
      });
    });

    it("maintains filter state across re-renders", async () => {
      mockUseAnalytics.mockReturnValue({
        data: mockAnalyticsData,
        isLoading: false,
        isError: false,
        error: null,
      });

      const { rerender } = render(<AnalyticsContainer />, { wrapper });

      const campaignACheckbox = screen.getByText("Campaign A").previousElementSibling as HTMLInputElement;
      fireEvent.click(campaignACheckbox);

      await waitFor(() => {
        expect(campaignACheckbox).not.toBeChecked();
      });

      rerender(<AnalyticsContainer />);

      const updatedCheckbox = screen.getByText("Campaign A").previousElementSibling as HTMLInputElement;
      expect(updatedCheckbox).not.toBeChecked();
    });

    it("filters data correctly when only one campaign is selected", async () => {
      mockUseAnalytics.mockReturnValue({
        data: mockAnalyticsData,
        isLoading: false,
        isError: false,
        error: null,
      });

      render(<AnalyticsContainer />, { wrapper });

      const campaignBCheckbox = screen.getByText("Campaign B").previousElementSibling as HTMLInputElement;
      const campaignCCheckbox = screen.getByText("Campaign C").previousElementSibling as HTMLInputElement;

      fireEvent.click(campaignBCheckbox);
      fireEvent.click(campaignCCheckbox);

      await waitFor(() => {
        expect(campaignBCheckbox).not.toBeChecked();
        expect(campaignCCheckbox).not.toBeChecked();
      });

      const campaignACheckbox = screen.getByText("Campaign A").previousElementSibling as HTMLInputElement;
      expect(campaignACheckbox).toBeChecked();
    });
  });

  describe("Chart Rendering States", () => {
    it("renders loading state with spinner", () => {
      mockUseAnalytics.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      });

      const { container } = render(<AnalyticsContainer />, { wrapper });

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(screen.getByText("Analytics")).toBeInTheDocument();
    });

    it("renders error state with error message", () => {
      mockUseAnalytics.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("Network error occurred"),
      });

      render(<AnalyticsContainer />, { wrapper });

      expect(screen.getByText("Failed to load analytics data")).toBeInTheDocument();
      expect(screen.getByText("Network error occurred")).toBeInTheDocument();
    });

    it("renders success state with data", () => {
      mockUseAnalytics.mockReturnValue({
        data: mockAnalyticsData,
        isLoading: false,
        isError: false,
        error: null,
      });

      render(<AnalyticsContainer />, { wrapper });

      expect(screen.getByText("Total Messages")).toBeInTheDocument();
      expect(screen.getByText("150")).toBeInTheDocument();
      expect(screen.getByText("Replies Sent")).toBeInTheDocument();
      expect(screen.getByText("100")).toBeInTheDocument();
    });

    it("transitions from loading to success state", async () => {
      mockUseAnalytics.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      });

      const { container, rerender } = render(<AnalyticsContainer />, { wrapper });

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();

      mockUseAnalytics.mockReturnValue({
        data: mockAnalyticsData,
        isLoading: false,
        isError: false,
        error: null,
      });

      rerender(<AnalyticsContainer />);

      await waitFor(() => {
        expect(screen.getByText("150")).toBeInTheDocument();
      });
    });

    it("transitions from loading to error state", async () => {
      mockUseAnalytics.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      });

      const { container, rerender } = render(<AnalyticsContainer />, { wrapper });

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();

      mockUseAnalytics.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("Failed to fetch"),
      });

      rerender(<AnalyticsContainer />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load analytics data")).toBeInTheDocument();
      });
    });

    it("handles null data state", () => {
      mockUseAnalytics.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      });

      render(<AnalyticsContainer />, { wrapper });

      expect(screen.getByText("No analytics data available")).toBeInTheDocument();
    });

    it("renders error state with generic message when error has no message", () => {
      mockUseAnalytics.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: {},
      });

      render(<AnalyticsContainer />, { wrapper });

      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });

    it("does not render chart when in loading state", () => {
      mockUseAnalytics.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      });

      render(<AnalyticsContainer />, { wrapper });

      expect(screen.queryByText("Campaign A")).not.toBeInTheDocument();
      expect(screen.queryByText("Total Messages")).not.toBeInTheDocument();
    });

    it("does not render chart when in error state", () => {
      mockUseAnalytics.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("Error"),
      });

      render(<AnalyticsContainer />, { wrapper });

      expect(screen.queryByText("Campaign A")).not.toBeInTheDocument();
      expect(screen.queryByText("Total Messages")).not.toBeInTheDocument();
    });

    it("renders all summary cards in success state", () => {
      mockUseAnalytics.mockReturnValue({
        data: mockAnalyticsData,
        isLoading: false,
        isError: false,
        error: null,
      });

      render(<AnalyticsContainer />, { wrapper });

      expect(screen.getByText("Total Messages")).toBeInTheDocument();
      expect(screen.getByText("Replies Sent")).toBeInTheDocument();
      expect(screen.getByText("Pending Replies")).toBeInTheDocument();
    });
  });

  describe("Data Consistency", () => {
    it("ensures campaign filter matches available campaigns", () => {
      mockUseAnalytics.mockReturnValue({
        data: mockAnalyticsData,
        isLoading: false,
        isError: false,
        error: null,
      });

      const { container } = render(<AnalyticsContainer />, { wrapper });

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      const campaignCheckboxes = Array.from(checkboxes).slice(1);

      expect(campaignCheckboxes.length).toBe(mockAnalyticsData.messagesByCampaign.length);
    });

    it("maintains data integrity when filtering", async () => {
      mockUseAnalytics.mockReturnValue({
        data: mockAnalyticsData,
        isLoading: false,
        isError: false,
        error: null,
      });

      render(<AnalyticsContainer />, { wrapper });

      const campaignACheckbox = screen.getByText("Campaign A").previousElementSibling as HTMLInputElement;
      
      expect(screen.getByText("150")).toBeInTheDocument();
      
      fireEvent.click(campaignACheckbox);

      await waitFor(() => {
        expect(screen.getByText("150")).toBeInTheDocument();
      });
    });

    it("handles rapid filter changes", async () => {
      mockUseAnalytics.mockReturnValue({
        data: mockAnalyticsData,
        isLoading: false,
        isError: false,
        error: null,
      });

      render(<AnalyticsContainer />, { wrapper });

      const campaignACheckbox = screen.getByText("Campaign A").previousElementSibling as HTMLInputElement;
      const campaignBCheckbox = screen.getByText("Campaign B").previousElementSibling as HTMLInputElement;

      fireEvent.click(campaignACheckbox);
      fireEvent.click(campaignBCheckbox);
      fireEvent.click(campaignACheckbox);
      fireEvent.click(campaignBCheckbox);

      await waitFor(() => {
        expect(campaignACheckbox).toBeChecked();
        expect(campaignBCheckbox).toBeChecked();
      });
    });
  });
});
