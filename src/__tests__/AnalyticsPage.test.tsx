import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import React from "react";

const mockUseAnalytics = vi.fn();

vi.mock("@/hooks/useAnalytics", () => ({
  useAnalytics: () => mockUseAnalytics(),
}));

vi.mock("@/components/PageLayout", () => ({
  PageLayout: ({ children }: any) => <div data-testid="page-layout">{children}</div>,
}));

vi.mock("@/components/analytics/AnalyticsContainer", () => ({
  AnalyticsContainer: () => <div data-testid="analytics-container">Analytics Container</div>,
}));

describe("AnalyticsPage", () => {
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

  it("renders the analytics page", () => {
    render(<AnalyticsPage />, { wrapper });

    expect(screen.getByTestId("page-layout")).toBeInTheDocument();
  });

  it("renders AnalyticsContainer component", () => {
    render(<AnalyticsPage />, { wrapper });

    expect(screen.getByTestId("analytics-container")).toBeInTheDocument();
  });

  it("uses PageLayout wrapper", () => {
    render(<AnalyticsPage />, { wrapper });

    expect(screen.getByTestId("page-layout")).toBeInTheDocument();
  });

  it("renders AnalyticsContainer inside PageLayout", () => {
    render(<AnalyticsPage />, { wrapper });

    const pageLayout = screen.getByTestId("page-layout");
    const analyticsContainer = screen.getByTestId("analytics-container");

    expect(pageLayout).toContainElement(analyticsContainer);
  });

  it("has minimal structure with only PageLayout and AnalyticsContainer", () => {
    render(<AnalyticsPage />, { wrapper });

    expect(screen.getByTestId("page-layout")).toBeInTheDocument();
    expect(screen.getByTestId("analytics-container")).toBeInTheDocument();
  });
});
