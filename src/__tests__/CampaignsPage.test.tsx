import React, { Suspense } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import * as CampaignsPageModule from "@/pages/CampaignsPage";

const mockUseSuspenseQuery = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useSuspenseQuery: () => mockUseSuspenseQuery(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/components/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const CampaignsPageComponent =
  (CampaignsPageModule as { CampaignsPage?: React.ComponentType })
    .CampaignsPage ??
  (CampaignsPageModule as { default?: React.ComponentType }).default!;

function renderCampaignsPage() {
  return render(
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <CampaignsPageComponent />
      </Suspense>
    </BrowserRouter>,
  );
}

describe("CampaignsPage", () => {
  beforeEach(() => {
    mockUseSuspenseQuery.mockReset();
    mockNavigate.mockClear();
  });

  it("shows a message when there are no campaigns", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [],
    });

    renderCampaignsPage();

    expect(screen.getByText(/no campaigns found/i)).toBeInTheDocument();
  });

  it("renders campaign rows with data", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [
        {
          id: "1",
          name: "Climate Action",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
        },
        {
          id: "2",
          name: "Education Reform",
          created_at: "2024-02-01T00:00:00Z",
          updated_at: "2024-02-02T00:00:00Z",
        },
      ],
    });

    renderCampaignsPage();

    expect(screen.getByText("Climate Action")).toBeInTheDocument();
    expect(screen.getByText("Education Reform")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("navigates to campaign messages page when a row is clicked", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [
        {
          id: "42",
          name: "Climate Action",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
        },
      ],
    });

    renderCampaignsPage();

    const campaignRow = screen.getByText("Climate Action").closest("tr");
    expect(campaignRow).toBeInTheDocument();

    fireEvent.click(campaignRow!);

    expect(mockNavigate).toHaveBeenCalledWith("/campaigns/42");
  });

  it("applies hover styles to campaign rows", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [
        {
          id: "1",
          name: "Climate Action",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
        },
      ],
    });

    renderCampaignsPage();

    const campaignRow = screen.getByText("Climate Action").closest("tr");
    expect(campaignRow).toHaveClass("cursor-pointer");
    expect(campaignRow).toHaveClass("hover:bg-gray-50");
  });
});
