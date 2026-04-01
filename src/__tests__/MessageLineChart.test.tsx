import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { MessageLineChart, type MessageLineChartData } from "@/components/charts/MessageLineChart";

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

describe("MessageLineChart", () => {
  const mockData: MessageLineChartData[] = [
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
    {
      date: "2026-04-03",
      campaigns: {
        "Campaign A": 40,
        "Campaign B": 32,
      },
    },
  ];

  beforeEach(() => {
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the chart component", () => {
    render(<MessageLineChart data={mockData} />);
    expect(screen.getByTestId("echarts-mock")).toBeInTheDocument();
  });

  it("accepts data as props and does not hardcode data", () => {
    const { container } = render(<MessageLineChart data={mockData} />);
    const chartElement = container.querySelector('[data-testid="echarts-mock"]');
    const optionData = chartElement?.getAttribute('data-option');
    
    expect(optionData).toBeTruthy();
    const option = JSON.parse(optionData!);
    
    expect(option.xAxis.data).toEqual(["2026-04-01", "2026-04-02", "2026-04-03"]);
    expect(option.series).toHaveLength(2);
  });

  it("supports multiple lines for different campaigns", () => {
    const { container } = render(<MessageLineChart data={mockData} />);
    const chartElement = container.querySelector('[data-testid="echarts-mock"]');
    const optionData = chartElement?.getAttribute('data-option');
    const option = JSON.parse(optionData!);
    
    expect(option.series).toHaveLength(2);
    expect(option.series[0].name).toBe("Campaign A");
    expect(option.series[1].name).toBe("Campaign B");
    expect(option.series[0].type).toBe("line");
    expect(option.series[1].type).toBe("line");
  });

  it("displays time-based x-axis with dates", () => {
    const { container } = render(<MessageLineChart data={mockData} />);
    const chartElement = container.querySelector('[data-testid="echarts-mock"]');
    const optionData = chartElement?.getAttribute('data-option');
    const option = JSON.parse(optionData!);
    
    expect(option.xAxis.type).toBe("category");
    expect(option.xAxis.data).toEqual(["2026-04-01", "2026-04-02", "2026-04-03"]);
  });

  it("renders with default height of 400", () => {
    const { container } = render(<MessageLineChart data={mockData} />);
    const chartElement = container.querySelector('[data-testid="echarts-mock"]');
    
    expect(chartElement).toHaveStyle({ height: '400px' });
  });

  it("accepts custom height prop", () => {
    const { container } = render(<MessageLineChart data={mockData} height={600} />);
    const chartElement = container.querySelector('[data-testid="echarts-mock"]');
    
    expect(chartElement).toHaveStyle({ height: '600px' });
  });

  it("accepts custom height as string", () => {
    const { container } = render(<MessageLineChart data={mockData} height="500px" />);
    const chartElement = container.querySelector('[data-testid="echarts-mock"]');
    
    expect(chartElement).toHaveStyle({ height: '500px' });
  });

  it("applies responsive width of 100%", () => {
    const { container } = render(<MessageLineChart data={mockData} />);
    const chartElement = container.querySelector('[data-testid="echarts-mock"]');
    
    expect(chartElement).toHaveStyle({ width: '100%' });
  });

  it("accepts custom className prop", () => {
    const { container } = render(<MessageLineChart data={mockData} className="custom-class" />);
    const wrapper = container.querySelector('.custom-class');
    
    expect(wrapper).toBeInTheDocument();
  });

  it("uses light mode colors by default", () => {
    const { container } = render(<MessageLineChart data={mockData} />);
    const chartElement = container.querySelector('[data-testid="echarts-mock"]');
    const optionData = chartElement?.getAttribute('data-option');
    const option = JSON.parse(optionData!);
    
    expect(option.color).toEqual(['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316']);
  });

  it("uses dark mode colors when dark class is present", async () => {
    document.documentElement.classList.add('dark');
    
    const { container } = render(<MessageLineChart data={mockData} />);
    
    await waitFor(() => {
      const chartElement = container.querySelector('[data-testid="echarts-mock"]');
      const optionData = chartElement?.getAttribute('data-option');
      const option = JSON.parse(optionData!);
      
      expect(option.color).toEqual(['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#fb923c']);
    });
  });

  it("updates colors when dark mode is toggled", async () => {
    const { container, rerender } = render(<MessageLineChart data={mockData} />);
    
    let chartElement = container.querySelector('[data-testid="echarts-mock"]');
    let optionData = chartElement?.getAttribute('data-option');
    let option = JSON.parse(optionData!);
    expect(option.color[0]).toBe('#3b82f6');
    
    document.documentElement.classList.add('dark');
    rerender(<MessageLineChart data={mockData} />);
    
    await waitFor(() => {
      chartElement = container.querySelector('[data-testid="echarts-mock"]');
      optionData = chartElement?.getAttribute('data-option');
      option = JSON.parse(optionData!);
      expect(option.color[0]).toBe('#60a5fa');
    });
  });

  it("handles empty data gracefully", () => {
    const { container } = render(<MessageLineChart data={[]} />);
    const chartElement = container.querySelector('[data-testid="echarts-mock"]');
    const optionData = chartElement?.getAttribute('data-option');
    const option = JSON.parse(optionData!);
    
    expect(option.series).toEqual([]);
    expect(option.xAxis.data).toEqual([]);
  });

  it("handles data with missing campaign values", () => {
    const dataWithMissing: MessageLineChartData[] = [
      {
        date: "2026-04-01",
        campaigns: {
          "Campaign A": 25,
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
    
    const { container } = render(<MessageLineChart data={dataWithMissing} />);
    const chartElement = container.querySelector('[data-testid="echarts-mock"]');
    const optionData = chartElement?.getAttribute('data-option');
    const option = JSON.parse(optionData!);
    
    const campaignBSeries = option.series.find((s: any) => s.name === "Campaign B");
    expect(campaignBSeries.data).toEqual([0, 28]);
  });

  it("configures chart with smooth lines", () => {
    const { container } = render(<MessageLineChart data={mockData} />);
    const chartElement = container.querySelector('[data-testid="echarts-mock"]');
    const optionData = chartElement?.getAttribute('data-option');
    const option = JSON.parse(optionData!);
    
    option.series.forEach((series: any) => {
      expect(series.smooth).toBe(true);
    });
  });

  it("includes tooltip configuration", () => {
    const { container } = render(<MessageLineChart data={mockData} />);
    const chartElement = container.querySelector('[data-testid="echarts-mock"]');
    const optionData = chartElement?.getAttribute('data-option');
    const option = JSON.parse(optionData!);
    
    expect(option.tooltip).toBeDefined();
    expect(option.tooltip.trigger).toBe('axis');
  });

  it("includes legend with campaign names", () => {
    const { container } = render(<MessageLineChart data={mockData} />);
    const chartElement = container.querySelector('[data-testid="echarts-mock"]');
    const optionData = chartElement?.getAttribute('data-option');
    const option = JSON.parse(optionData!);
    
    expect(option.legend).toBeDefined();
    expect(option.legend.data).toEqual(["Campaign A", "Campaign B"]);
  });

  it("configures grid for proper spacing", () => {
    const { container } = render(<MessageLineChart data={mockData} />);
    const chartElement = container.querySelector('[data-testid="echarts-mock"]');
    const optionData = chartElement?.getAttribute('data-option');
    const option = JSON.parse(optionData!);
    
    expect(option.grid).toBeDefined();
    expect(option.grid.containLabel).toBe(true);
  });

  it("configures x-axis with rotated labels", () => {
    const { container } = render(<MessageLineChart data={mockData} />);
    const chartElement = container.querySelector('[data-testid="echarts-mock"]');
    const optionData = chartElement?.getAttribute('data-option');
    const option = JSON.parse(optionData!);
    
    expect(option.xAxis.axisLabel.rotate).toBe(45);
  });

  it("uses transparent background for proper integration", () => {
    const { container } = render(<MessageLineChart data={mockData} />);
    const chartElement = container.querySelector('[data-testid="echarts-mock"]');
    const optionData = chartElement?.getAttribute('data-option');
    const option = JSON.parse(optionData!);
    
    expect(option.backgroundColor).toBe('transparent');
  });

  it("handles single campaign data", () => {
    const singleCampaignData: MessageLineChartData[] = [
      { date: "2026-04-01", campaigns: { "Campaign A": 25 } },
      { date: "2026-04-02", campaigns: { "Campaign A": 35 } },
    ];
    
    const { container } = render(<MessageLineChart data={singleCampaignData} />);
    const chartElement = container.querySelector('[data-testid="echarts-mock"]');
    const optionData = chartElement?.getAttribute('data-option');
    const option = JSON.parse(optionData!);
    
    expect(option.series).toHaveLength(1);
    expect(option.series[0].name).toBe("Campaign A");
  });

  it("handles multiple campaigns (more than 2)", () => {
    const multiCampaignData: MessageLineChartData[] = [
      {
        date: "2026-04-01",
        campaigns: {
          "Campaign A": 25,
          "Campaign B": 30,
          "Campaign C": 20,
          "Campaign D": 15,
        },
      },
    ];
    
    const { container } = render(<MessageLineChart data={multiCampaignData} />);
    const chartElement = container.querySelector('[data-testid="echarts-mock"]');
    const optionData = chartElement?.getAttribute('data-option');
    const option = JSON.parse(optionData!);
    
    expect(option.series).toHaveLength(4);
  });
});
