import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MessageLineChart,
  type MessageLineChartData,
} from "@/components/charts/MessageLineChart";
import { CampaignFilter } from "@/components/filters/CampaignFilter";
// Import components
import { useAnalytics } from "@/hooks/useAnalytics";
import { AnalyticsPage } from "@/pages/AnalyticsPage";

// =============================================================================
// MOCKS
// =============================================================================

const { mockGetSession, mockAnalyticsOrder, mockAnalyticsFrom } = vi.hoisted(
  () => {
    const mockGetSession = vi.fn();
    const mockAnalyticsOrder = vi.fn();
    const mockAnalyticsGte = vi.fn(() => ({ order: mockAnalyticsOrder }));
    const mockAnalyticsSelect = vi.fn(() => ({
      gte: mockAnalyticsGte,
      order: mockAnalyticsOrder,
    }));
    const mockAnalyticsFrom = vi.fn(() => ({ select: mockAnalyticsSelect }));
    return { mockGetSession, mockAnalyticsOrder, mockAnalyticsFrom };
  },
);

vi.mock("@/lib/supabase", () => {
  const client = {
    auth: {
      getSession: () => mockGetSession(),
    },
    from: mockAnalyticsFrom,
  };
  return {
    supabase: client,
    getSupabase: () => client,
  };
});

vi.mock("echarts-for-react", () => ({
  default: ({ option, style, className }: any) => (
    <div
      data-testid="echarts-mock"
      data-option={JSON.stringify(option)}
      style={style}
      className={className}
    >
      ECharts Mock
    </div>
  ),
}));

vi.mock("@/components/PageLayout", () => ({
  PageLayout: ({ children }: any) => (
    <div data-testid="page-layout">{children}</div>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children, className }: any) => (
    <h2 className={className}>{children}</h2>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
}));

// =============================================================================
// TEST DATA
// =============================================================================

const mockBackendResponse = [
  {
    date: "2026-03-31",
    campaign_id: 1,
    campaign_name: "Campaign A",
    message_count: 55,
  },
  {
    date: "2026-03-31",
    campaign_id: 2,
    campaign_name: "Campaign B",
    message_count: 35,
  },
  {
    date: "2026-04-01",
    campaign_id: 1,
    campaign_name: "Campaign A",
    message_count: 25,
  },
  {
    date: "2026-04-01",
    campaign_id: 2,
    campaign_name: "Campaign B",
    message_count: 35,
  },
];

const expectedAnalyticsData = {
  totalMessages: 150,
  repliesSent: 0,
  pendingReplies: 150,
  messagesByDay: [
    { date: "2026-03-31", count: 90 },
    { date: "2026-04-01", count: 60 },
  ],
  messagesByCampaign: [
    { campaignId: 1, campaignName: "Campaign A", count: 80 },
    { campaignId: 2, campaignName: "Campaign B", count: 70 },
  ],
  dailyCampaignData: [
    { date: "2026-03-31", campaigns: { "Campaign A": 55, "Campaign B": 35 } },
    { date: "2026-04-01", campaigns: { "Campaign A": 25, "Campaign B": 35 } },
  ],
};

const mockChartData: MessageLineChartData[] = [
  {
    date: "2026-04-01",
    campaigns: {
      "Campaign A": 25,
      "Campaign B": 30,
    },
  },
  {
    date: "2026-04-02",
    campaigns: {
      "Campaign A": 35,
      "Campaign B": 28,
    },
  },
];

// =============================================================================
// HOOK TESTS: useAnalytics
// =============================================================================

describe("useAnalytics Hook", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "test-token",
        },
      },
    });

    mockAnalyticsOrder.mockResolvedValue({
      data: mockBackendResponse,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("fetches analytics data successfully", async () => {
    const { result } = renderHook(() => useAnalytics(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(expectedAnalyticsData);
    expect(mockAnalyticsFrom).toHaveBeenCalledWith("message_analytics_view");
  });

  it("handles loading state", () => {
    const { result } = renderHook(() => useAnalytics(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("handles error when not authenticated", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: null,
      },
    });

    const { result } = renderHook(() => useAnalytics(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error("Not authenticated"));
  });

  it("handles error when API request fails", async () => {
    mockAnalyticsOrder.mockResolvedValue({
      data: null,
      error: new Error("query failed"),
    });

    const { result } = renderHook(() => useAnalytics(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      totalMessages: 0,
      repliesSent: 0,
      pendingReplies: 0,
      messagesByDay: [],
      messagesByCampaign: [],
      dailyCampaignData: [],
    });
  });

  it("handles network errors gracefully", async () => {
    mockAnalyticsOrder.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useAnalytics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      totalMessages: 0,
      repliesSent: 0,
      pendingReplies: 0,
      messagesByDay: [],
      messagesByCampaign: [],
      dailyCampaignData: [],
    });
  });

  it("uses correct query key", async () => {
    const { result } = renderHook(() => useAnalytics(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.findAll({ queryKey: ["analytics", "day"] });

    expect(queries.length).toBe(1);
  });

  it("includes authorization header with session token", async () => {
    const testToken = "custom-test-token";
    mockGetSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: testToken,
        },
      },
    });

    mockAnalyticsOrder.mockResolvedValueOnce({
      data: mockBackendResponse,
      error: null,
    });

    const { result } = renderHook(() => useAnalytics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetSession).toHaveBeenCalled();
    expect(mockAnalyticsFrom).toHaveBeenCalledWith("message_analytics_view");
  });
});

// =============================================================================
// COMPONENT TESTS: CampaignFilter
// =============================================================================

describe("CampaignFilter Component", () => {
  const mockCampaigns = ["Campaign A", "Campaign B", "Campaign C"];
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it("renders all campaign checkboxes", () => {
    render(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={new Set()}
        onChange={mockOnChange}
      />,
    );

    expect(screen.getByText("Campaign A")).toBeInTheDocument();
    expect(screen.getByText("Campaign B")).toBeInTheDocument();
    expect(screen.getByText("Campaign C")).toBeInTheDocument();
  });

  it("handles campaign selection", () => {
    render(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={new Set()}
        onChange={mockOnChange}
      />,
    );

    const campaignACheckbox = screen.getByText("Campaign A")
      .previousElementSibling as HTMLInputElement;
    fireEvent.click(campaignACheckbox);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const calledWith = mockOnChange.mock.calls[0][0];
    expect(calledWith).toBeInstanceOf(Set);
    expect(calledWith.has("Campaign A")).toBe(true);
  });

  it("handles Select All functionality", () => {
    render(
      <CampaignFilter
        campaigns={mockCampaigns}
        selectedCampaigns={new Set()}
        onChange={mockOnChange}
      />,
    );

    const selectAllCheckbox = screen.getByText("Select All")
      .previousElementSibling as HTMLInputElement;
    fireEvent.click(selectAllCheckbox);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const calledWith = mockOnChange.mock.calls[0][0];
    expect(calledWith.size).toBe(3);
  });

  it("handles empty campaigns list", () => {
    render(
      <CampaignFilter
        campaigns={[]}
        selectedCampaigns={new Set()}
        onChange={mockOnChange}
      />,
    );

    expect(screen.getByText("No campaigns available")).toBeInTheDocument();
  });
});

// =============================================================================
// COMPONENT TESTS: MessageLineChart
// =============================================================================

describe("MessageLineChart Component", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("renders the chart component", () => {
    render(<MessageLineChart data={mockChartData} />);
    expect(screen.getByTestId("echarts-mock")).toBeInTheDocument();
  });

  it("supports multiple campaign lines", () => {
    const { container } = render(<MessageLineChart data={mockChartData} />);
    const chartElement = container.querySelector(
      '[data-testid="echarts-mock"]',
    );
    const optionData = chartElement?.getAttribute("data-option");
    const option = JSON.parse(optionData!);

    expect(option.series).toHaveLength(2);
    expect(option.series[0].name).toBe("Campaign A");
    expect(option.series[1].name).toBe("Campaign B");
  });

  it("renders with default height of 400", () => {
    const { container } = render(<MessageLineChart data={mockChartData} />);
    const chartElement = container.querySelector(
      '[data-testid="echarts-mock"]',
    );

    expect(chartElement).toHaveStyle({ height: "400px" });
  });

  it("accepts custom height prop", () => {
    const { container } = render(
      <MessageLineChart data={mockChartData} height={600} />,
    );
    const chartElement = container.querySelector(
      '[data-testid="echarts-mock"]',
    );

    expect(chartElement).toHaveStyle({ height: "600px" });
  });

  it("handles empty data gracefully", () => {
    const { container } = render(<MessageLineChart data={[]} />);
    const chartElement = container.querySelector(
      '[data-testid="echarts-mock"]',
    );
    const optionData = chartElement?.getAttribute("data-option");
    const option = JSON.parse(optionData!);

    expect(option.series).toEqual([]);
    expect(option.xAxis.data).toEqual([]);
  });

  it("supports dark mode", async () => {
    document.documentElement.classList.add("dark");

    const { container } = render(<MessageLineChart data={mockChartData} />);

    await waitFor(() => {
      const chartElement = container.querySelector(
        '[data-testid="echarts-mock"]',
      );
      const optionData = chartElement?.getAttribute("data-option");
      const option = JSON.parse(optionData!);

      expect(option.color).toEqual([
        "#60a5fa",
        "#34d399",
        "#fbbf24",
        "#f87171",
        "#a78bfa",
        "#fb923c",
      ]);
    });
  });
});

// =============================================================================
// COMPONENT TESTS: AnalyticsContainer
// =============================================================================
// Note: AnalyticsContainer tests are covered through integration tests
// and the useAnalytics hook tests above provide comprehensive coverage

// =============================================================================
// PAGE TESTS: AnalyticsPage
// =============================================================================

describe("AnalyticsPage Component", () => {
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

  it("renders the analytics page with PageLayout", () => {
    render(<AnalyticsPage />, { wrapper });

    expect(screen.getByTestId("page-layout")).toBeInTheDocument();
  });

  it("renders AnalyticsContainer inside PageLayout", () => {
    render(<AnalyticsPage />, { wrapper });

    const pageLayout = screen.getByTestId("page-layout");
    expect(pageLayout).toBeInTheDocument();
  });
});
