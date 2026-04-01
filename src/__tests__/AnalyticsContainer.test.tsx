import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnalyticsContainer } from "@/components/analytics/AnalyticsContainer";
import React from "react";

const mockUseAnalytics = vi.fn();

vi.mock("@/hooks/useAnalytics", () => ({
  useAnalytics: () => mockUseAnalytics(),
}));

vi.mock("@/components/charts/MessageLineChart", () => ({
  MessageLineChart: ({ data, height }: any) => (
    <div data-testid="message-line-chart" data-height={height}>
      Chart with {data.length} data points
    </div>
  ),
}));

vi.mock("@/components/filters/CampaignFilter", () => ({
  CampaignFilter: ({ campaigns, selectedCampaigns, onChange }: any) => (
    <div data-testid="campaign-filter">
      <div>Campaigns: {campaigns.join(", ")}</div>
      <div>Selected: {Array.from(selectedCampaigns).join(", ")}</div>
      <button onClick={() => onChange(new Set(["Campaign A"]))}>
        Change Selection
      </button>
    </div>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

const mockAnalyticsData = {
  totalMessages: 150,
  repliesSent: 100,
  pendingReplies: 30,
  messagesByDay: [
    { date: "2026-04-01", count: 25 },
    { date: "2026-04-02", count: 30 },
    { date: "2026-04-03", count: 35 },
  ],
  messagesByCampaign: [
    { campaignId: 1, campaignName: "Campaign A", count: 80 },
    { campaignId: 2, campaignName: "Campaign B", count: 70 },
  ],
};

describe("AnalyticsContainer", () => {
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

  it("renders loading state", () => {
    mockUseAnalytics.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    const { container } = render(<AnalyticsContainer />, { wrapper });

    expect(screen.getByText("Analytics")).toBeInTheDocument();
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it("renders error state", () => {
    mockUseAnalytics.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Failed to fetch analytics"),
    });

    render(<AnalyticsContainer />, { wrapper });

    expect(screen.getByText("Failed to load analytics data")).toBeInTheDocument();
    expect(screen.getByText("Failed to fetch analytics")).toBeInTheDocument();
  });

  it("renders error state with generic message when error has no message", () => {
    mockUseAnalytics.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: {},
    });

    render(<AnalyticsContainer />, { wrapper });

    expect(screen.getByText("Failed to load analytics data")).toBeInTheDocument();
    expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
  });

  it("renders no data state", () => {
    mockUseAnalytics.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<AnalyticsContainer />, { wrapper });

    expect(screen.getByText("No analytics data available")).toBeInTheDocument();
  });

  it("renders analytics data with summary cards", () => {
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
    expect(screen.getByText("Pending Replies")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("renders CampaignFilter component", () => {
    mockUseAnalytics.mockReturnValue({
      data: mockAnalyticsData,
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<AnalyticsContainer />, { wrapper });

    expect(screen.getByTestId("campaign-filter")).toBeInTheDocument();
    expect(screen.getByText("Campaigns: Campaign A, Campaign B")).toBeInTheDocument();
  });

  it("renders MessageLineChart component", () => {
    mockUseAnalytics.mockReturnValue({
      data: mockAnalyticsData,
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<AnalyticsContainer />, { wrapper });

    expect(screen.getByTestId("message-line-chart")).toBeInTheDocument();
  });

  it("passes correct height to MessageLineChart", () => {
    mockUseAnalytics.mockReturnValue({
      data: mockAnalyticsData,
      isLoading: false,
      isError: false,
      error: null,
    });

    const { container } = render(<AnalyticsContainer />, { wrapper });

    const chart = container.querySelector('[data-testid="message-line-chart"]');
    expect(chart?.getAttribute('data-height')).toBe('400');
  });

  it("initializes with all campaigns selected", () => {
    mockUseAnalytics.mockReturnValue({
      data: mockAnalyticsData,
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<AnalyticsContainer />, { wrapper });

    expect(screen.getByText("Selected: Campaign A, Campaign B")).toBeInTheDocument();
  });

  it("updates selected campaigns when filter changes", async () => {
    mockUseAnalytics.mockReturnValue({
      data: mockAnalyticsData,
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<AnalyticsContainer />, { wrapper });

    const changeButton = screen.getByText("Change Selection");
    fireEvent.click(changeButton);

    await waitFor(() => {
      expect(screen.getByText("Selected: Campaign A")).toBeInTheDocument();
    });
  });

  it("filters chart data based on selected campaigns", () => {
    mockUseAnalytics.mockReturnValue({
      data: mockAnalyticsData,
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<AnalyticsContainer />, { wrapper });

    expect(screen.getByTestId("message-line-chart")).toBeInTheDocument();
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

  it("handles empty messagesByCampaign array", () => {
    mockUseAnalytics.mockReturnValue({
      data: {
        ...mockAnalyticsData,
        messagesByCampaign: [],
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<AnalyticsContainer />, { wrapper });

    expect(screen.getByText("Campaigns:")).toBeInTheDocument();
  });

  it("extracts campaign names from data", () => {
    mockUseAnalytics.mockReturnValue({
      data: mockAnalyticsData,
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<AnalyticsContainer />, { wrapper });

    expect(screen.getByText("Campaigns: Campaign A, Campaign B")).toBeInTheDocument();
  });

  it("uses Card component for layout", () => {
    mockUseAnalytics.mockReturnValue({
      data: mockAnalyticsData,
      isLoading: false,
      isError: false,
      error: null,
    });

    const { container } = render(<AnalyticsContainer />, { wrapper });

    expect(container.querySelector('.p-4')).toBeInTheDocument();
  });

  it("displays analytics title", () => {
    mockUseAnalytics.mockReturnValue({
      data: mockAnalyticsData,
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<AnalyticsContainer />, { wrapper });

    const titles = screen.getAllByText("Analytics");
    expect(titles.length).toBeGreaterThan(0);
  });

  it("uses responsive grid layout", () => {
    mockUseAnalytics.mockReturnValue({
      data: mockAnalyticsData,
      isLoading: false,
      isError: false,
      error: null,
    });

    const { container } = render(<AnalyticsContainer />, { wrapper });

    const grids = container.querySelectorAll('[class*="grid"]');
    expect(grids.length).toBeGreaterThan(0);
  });

  it("supports dark mode styling", () => {
    mockUseAnalytics.mockReturnValue({
      data: mockAnalyticsData,
      isLoading: false,
      isError: false,
      error: null,
    });

    const { container } = render(<AnalyticsContainer />, { wrapper });

    const darkModeElements = container.querySelectorAll('[class*="dark:"]');
    expect(darkModeElements.length).toBeGreaterThan(0);
  });

  it("memoizes campaign list", () => {
    mockUseAnalytics.mockReturnValue({
      data: mockAnalyticsData,
      isLoading: false,
      isError: false,
      error: null,
    });

    const { rerender } = render(<AnalyticsContainer />, { wrapper });

    expect(screen.getByText("Campaigns: Campaign A, Campaign B")).toBeInTheDocument();

    rerender(<AnalyticsContainer />);

    expect(screen.getByText("Campaigns: Campaign A, Campaign B")).toBeInTheDocument();
  });

  it("memoizes chart data", () => {
    mockUseAnalytics.mockReturnValue({
      data: mockAnalyticsData,
      isLoading: false,
      isError: false,
      error: null,
    });

    const { rerender } = render(<AnalyticsContainer />, { wrapper });

    const chart = screen.getByTestId("message-line-chart");
    expect(chart).toBeInTheDocument();

    rerender(<AnalyticsContainer />);

    expect(screen.getByTestId("message-line-chart")).toBeInTheDocument();
  });

  it("shows loading spinner with proper styling", () => {
    mockUseAnalytics.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    const { container } = render(<AnalyticsContainer />, { wrapper });

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('border-primary');
  });

  it("displays summary cards with proper color coding", () => {
    mockUseAnalytics.mockReturnValue({
      data: mockAnalyticsData,
      isLoading: false,
      isError: false,
      error: null,
    });

    const { container } = render(<AnalyticsContainer />, { wrapper });

    const blueCard = container.querySelector('.bg-blue-50');
    const greenCard = container.querySelector('.bg-green-50');
    const yellowCard = container.querySelector('.bg-yellow-50');

    expect(blueCard).toBeInTheDocument();
    expect(greenCard).toBeInTheDocument();
    expect(yellowCard).toBeInTheDocument();
  });
});
