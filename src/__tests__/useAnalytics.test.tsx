import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAnalytics } from "@/hooks/useAnalytics";
import React from "react";

const mockGetSession = vi.fn();
const mockFetch = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

global.fetch = mockFetch;

// Backend response format (now returns daily aggregated data)
const mockBackendResponse = {
  analytics: [
    { date: "2026-03-31", campaign_id: 1, campaign_name: "Campaign A", message_count: 55 },
    { date: "2026-03-31", campaign_id: 2, campaign_name: "Campaign B", message_count: 35 },
    { date: "2026-04-01", campaign_id: 1, campaign_name: "Campaign A", message_count: 25 },
    { date: "2026-04-01", campaign_id: 2, campaign_name: "Campaign B", message_count: 35 },
  ],
};

// Expected transformed data
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

describe("useAnalytics", () => {
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

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockBackendResponse,
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
    expect(mockFetch).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_URL}/api/v1/messages/analytics`,
      {
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        },
      }
    );
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
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
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

  it("uses correct query key", async () => {
    const { result } = renderHook(() => useAnalytics(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.findAll({ queryKey: ["analytics"] });

    expect(queries.length).toBe(1);
  });

  it("returns correct data structure", async () => {
    const { result } = renderHook(() => useAnalytics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveProperty("totalMessages");
    expect(result.current.data).toHaveProperty("repliesSent");
    expect(result.current.data).toHaveProperty("pendingReplies");
    expect(result.current.data).toHaveProperty("messagesByDay");
    expect(result.current.data).toHaveProperty("messagesByCampaign");
    expect(Array.isArray(result.current.data?.messagesByDay)).toBe(true);
    expect(Array.isArray(result.current.data?.messagesByCampaign)).toBe(true);
  });

  it("handles network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

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

  it("includes authorization header with session token", async () => {
    const testToken = "custom-test-token";
    mockGetSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: testToken,
        },
      },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockBackendResponse,
    });

    const { result } = renderHook(() => useAnalytics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${testToken}`,
        }),
      })
    );
  });
});
