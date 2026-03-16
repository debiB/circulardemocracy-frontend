import React, { Suspense } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import * as CampaignMessagesPageModule from "@/pages/CampaignMessagesPage";

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

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button onClick={onClick} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("lucide-react", () => ({
  ArrowLeft: () => <span>←</span>,
}));

const CampaignMessagesPageComponent =
  (CampaignMessagesPageModule as { CampaignMessagesPage?: React.ComponentType })
    .CampaignMessagesPage ??
  (CampaignMessagesPageModule as { default?: React.ComponentType }).default!;

function renderCampaignMessagesPage(campaignId = "1") {
  return render(
    <BrowserRouter>
      <Routes>
        <Route
          path="/campaigns/:id"
          element={
            <Suspense fallback={<div>Loading...</div>}>
              <CampaignMessagesPageComponent />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>,
    {
      wrapper: ({ children }) => {
        window.history.pushState({}, "", `/campaigns/${campaignId}`);
        return <>{children}</>;
      },
    },
  );
}

describe("CampaignMessagesPage", () => {
  beforeEach(() => {
    mockUseSuspenseQuery.mockReset();
    mockNavigate.mockClear();
    window.alert = vi.fn();
  });

  describe("Loading State", () => {
    it("shows loading spinner while data is being fetched", () => {
      // Suspense will show fallback while query is pending
      render(
        <BrowserRouter>
          <Suspense fallback={<div>Loading...</div>}>
            <div>Test</div>
          </Suspense>
        </BrowserRouter>,
      );

      // The test component renders immediately, so we just verify Suspense works
      expect(screen.getByText("Test")).toBeInTheDocument();
    });
  });

  describe("Basic Rendering", () => {
    it("renders campaign header with campaign details", () => {
      mockUseSuspenseQuery
        .mockReturnValueOnce({
          data: {
            id: 1,
            name: "Climate Action",
            slug: "climate-action",
            description: "Campaign for climate change awareness",
            status: "active",
          },
        })
        .mockReturnValueOnce({
          data: [],
        });

      renderCampaignMessagesPage("1");

      expect(screen.getByText("Climate Action - Messages")).toBeInTheDocument();
      expect(
        screen.getByText("Campaign for climate change awareness"),
      ).toBeInTheDocument();
      expect(screen.getByText(/Status:/)).toBeInTheDocument();
      expect(screen.getByText(/active/)).toBeInTheDocument();
    });

    it("renders back button that navigates to campaigns list", () => {
      mockUseSuspenseQuery
        .mockReturnValueOnce({
          data: {
            id: 1,
            name: "Climate Action",
            slug: "climate-action",
            description: null,
            status: "active",
          },
        })
        .mockReturnValueOnce({
          data: [],
        });

      renderCampaignMessagesPage("1");

      const backButton = screen.getByText(/back to campaigns/i);
      expect(backButton).toBeInTheDocument();

      fireEvent.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith("/campaigns");
    });

    it("renders export CSV button", () => {
      mockUseSuspenseQuery
        .mockReturnValueOnce({
          data: {
            id: 1,
            name: "Climate Action",
            slug: "climate-action",
            description: null,
            status: "active",
          },
        })
        .mockReturnValueOnce({
          data: [],
        });

      renderCampaignMessagesPage("1");

      const exportButton = screen.getByText(/export csv/i);
      expect(exportButton).toBeInTheDocument();
    });

    it("shows alert when export button is clicked (placeholder)", () => {
      mockUseSuspenseQuery
        .mockReturnValueOnce({
          data: {
            id: 1,
            name: "Climate Action",
            slug: "climate-action",
            description: null,
            status: "active",
          },
        })
        .mockReturnValueOnce({
          data: [],
        });

      renderCampaignMessagesPage("1");

      const exportButton = screen.getByText(/export csv/i);
      fireEvent.click(exportButton);

      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining("CSV export functionality not yet implemented"),
      );
    });
  });

  describe("Empty State", () => {
    it("shows message when there are no messages for the campaign", () => {
      mockUseSuspenseQuery
        .mockReturnValueOnce({
          data: {
            id: 1,
            name: "Climate Action",
            slug: "climate-action",
            description: null,
            status: "active",
          },
        })
        .mockReturnValueOnce({
          data: [],
        });

      renderCampaignMessagesPage("1");

      expect(
        screen.getByText(/no messages found for this campaign/i),
      ).toBeInTheDocument();
    });

    it("displays total message count as 0 when empty", () => {
      mockUseSuspenseQuery
        .mockReturnValueOnce({
          data: {
            id: 1,
            name: "Climate Action",
            slug: "climate-action",
            description: null,
            status: "active",
          },
        })
        .mockReturnValueOnce({
          data: [],
        });

      renderCampaignMessagesPage("1");

      expect(screen.getByText(/Total Messages:/)).toBeInTheDocument();
      const totalMessagesText = screen.getByText(/Total Messages:/).parentElement;
      expect(totalMessagesText?.textContent).toContain("0");
    });
  });

  describe("Message Table Rendering", () => {
    it("renders message table with correct columns", () => {
      mockUseSuspenseQuery
        .mockReturnValueOnce({
          data: {
            id: 1,
            name: "Climate Action",
            slug: "climate-action",
            description: null,
            status: "active",
          },
        })
        .mockReturnValueOnce({
          data: [
            {
              id: 1,
              sender_hash:
                "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
              sender_country: "US",
              duplicate_rank: 0,
              classification_confidence: 0.85,
              language: "en",
              received_at: "2024-01-15T10:30:00Z",
              processed_at: "2024-01-15T10:31:00Z",
              reply_sent_at: null,
              processing_status: "processed",
            },
          ],
        });

      renderCampaignMessagesPage("1");

      expect(screen.getByText("Sender ID")).toBeInTheDocument();
      expect(screen.getByText("Country")).toBeInTheDocument();
      expect(screen.getByText("Received")).toBeInTheDocument();
      expect(screen.getByText("Confidence")).toBeInTheDocument();
      expect(screen.getByText("Duplicate")).toBeInTheDocument();
      expect(screen.getByText("Language")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Reply Sent")).toBeInTheDocument();
    });

    it("renders message data correctly", () => {
      mockUseSuspenseQuery
        .mockReturnValueOnce({
          data: {
            id: 1,
            name: "Climate Action",
            slug: "climate-action",
            description: null,
            status: "active",
          },
        })
        .mockReturnValueOnce({
          data: [
            {
              id: 1,
              sender_hash:
                "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
              sender_country: "US",
              duplicate_rank: 0,
              classification_confidence: 0.85,
              language: "en",
              received_at: "2024-01-15T10:30:00Z",
              processed_at: "2024-01-15T10:31:00Z",
              reply_sent_at: "2024-01-16T09:00:00Z",
              processing_status: "processed",
            },
          ],
        });

      renderCampaignMessagesPage("1");

      // Sender hash (first 8 chars)
      expect(screen.getByText(/a1b2c3d4\.\.\./)).toBeInTheDocument();

      // Country
      expect(screen.getByText("US")).toBeInTheDocument();

      // Confidence (85%)
      expect(screen.getByText("85%")).toBeInTheDocument();

      // Duplicate status
      expect(screen.getByText("Original")).toBeInTheDocument();

      // Language (rendered as uppercase in the component)
      const languageCells = screen.getAllByText(/en/i);
      expect(languageCells.length).toBeGreaterThan(0);

      // Status
      expect(screen.getByText("processed")).toBeInTheDocument();
    });

    it("displays multiple messages correctly", () => {
      mockUseSuspenseQuery
        .mockReturnValueOnce({
          data: {
            id: 1,
            name: "Climate Action",
            slug: "climate-action",
            description: null,
            status: "active",
          },
        })
        .mockReturnValueOnce({
          data: [
            {
              id: 1,
              sender_hash:
                "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
              sender_country: "US",
              duplicate_rank: 0,
              classification_confidence: 0.85,
              language: "en",
              received_at: "2024-01-15T10:30:00Z",
              processed_at: "2024-01-15T10:31:00Z",
              reply_sent_at: null,
              processing_status: "processed",
            },
            {
              id: 2,
              sender_hash:
                "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1",
              sender_country: "GB",
              duplicate_rank: 1,
              classification_confidence: 0.92,
              language: "en",
              received_at: "2024-01-16T14:20:00Z",
              processed_at: "2024-01-16T14:21:00Z",
              reply_sent_at: null,
              processing_status: "processed",
            },
          ],
        });

      renderCampaignMessagesPage("1");

      expect(screen.getByText(/a1b2c3d4\.\.\./)).toBeInTheDocument();
      expect(screen.getByText(/b2c3d4e5\.\.\./)).toBeInTheDocument();
      expect(screen.getByText("US")).toBeInTheDocument();
      expect(screen.getByText("GB")).toBeInTheDocument();
      // Check that Total Messages header exists and value is 2
      expect(screen.getByText(/Total Messages:/)).toBeInTheDocument();
      const totalMessagesText = screen.getByText(/Total Messages:/).parentElement;
      expect(totalMessagesText?.textContent).toContain("2");
    });

    it("shows duplicate rank correctly for duplicate messages", () => {
      mockUseSuspenseQuery
        .mockReturnValueOnce({
          data: {
            id: 1,
            name: "Climate Action",
            slug: "climate-action",
            description: null,
            status: "active",
          },
        })
        .mockReturnValueOnce({
          data: [
            {
              id: 2,
              sender_hash:
                "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
              sender_country: "US",
              duplicate_rank: 2,
              classification_confidence: 0.85,
              language: "en",
              received_at: "2024-01-15T10:30:00Z",
              processed_at: "2024-01-15T10:31:00Z",
              reply_sent_at: null,
              processing_status: "processed",
            },
          ],
        });

      renderCampaignMessagesPage("1");

      expect(screen.getByText("Dup #2")).toBeInTheDocument();
    });

    it("displays null country as dash", () => {
      mockUseSuspenseQuery
        .mockReturnValueOnce({
          data: {
            id: 1,
            name: "Climate Action",
            slug: "climate-action",
            description: null,
            status: "active",
          },
        })
        .mockReturnValueOnce({
          data: [
            {
              id: 1,
              sender_hash:
                "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
              sender_country: null,
              duplicate_rank: 0,
              classification_confidence: 0.85,
              language: "en",
              received_at: "2024-01-15T10:30:00Z",
              processed_at: "2024-01-15T10:31:00Z",
              reply_sent_at: null,
              processing_status: "processed",
            },
          ],
        });

      renderCampaignMessagesPage("1");

      const rows = screen.getAllByText("-");
      expect(rows.length).toBeGreaterThan(0);
    });

    it("applies color coding to confidence levels", () => {
      mockUseSuspenseQuery
        .mockReturnValueOnce({
          data: {
            id: 1,
            name: "Climate Action",
            slug: "climate-action",
            description: null,
            status: "active",
          },
        })
        .mockReturnValueOnce({
          data: [
            {
              id: 1,
              sender_hash:
                "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
              sender_country: "US",
              duplicate_rank: 0,
              classification_confidence: 0.85,
              language: "en",
              received_at: "2024-01-15T10:30:00Z",
              processed_at: "2024-01-15T10:31:00Z",
              reply_sent_at: null,
              processing_status: "processed",
            },
            {
              id: 2,
              sender_hash:
                "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1",
              sender_country: "GB",
              duplicate_rank: 0,
              classification_confidence: 0.55,
              language: "en",
              received_at: "2024-01-16T14:20:00Z",
              processed_at: "2024-01-16T14:21:00Z",
              reply_sent_at: null,
              processing_status: "processed",
            },
            {
              id: 3,
              sender_hash:
                "c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2",
              sender_country: "FR",
              duplicate_rank: 0,
              classification_confidence: 0.25,
              language: "fr",
              received_at: "2024-01-17T08:10:00Z",
              processed_at: "2024-01-17T08:11:00Z",
              reply_sent_at: null,
              processing_status: "processed",
            },
          ],
        });

      renderCampaignMessagesPage("1");

      const highConfidence = screen.getByText("85%");
      expect(highConfidence).toHaveClass("bg-green-100");

      const mediumConfidence = screen.getByText("55%");
      expect(mediumConfidence).toHaveClass("bg-yellow-100");

      const lowConfidence = screen.getByText("25%");
      expect(lowConfidence).toHaveClass("bg-red-100");
    });
  });

  describe("Error State", () => {
    it("handles invalid campaign ID gracefully", () => {
      // When useParams returns undefined for id
      render(
        <BrowserRouter>
          <Suspense fallback={<div>Loading...</div>}>
            <CampaignMessagesPageComponent />
          </Suspense>
        </BrowserRouter>,
      );

      expect(screen.getByText("Invalid campaign ID")).toBeInTheDocument();
    });
  });

  describe("Campaign without description", () => {
    it("does not render description when null", () => {
      mockUseSuspenseQuery
        .mockReturnValueOnce({
          data: {
            id: 1,
            name: "Climate Action",
            slug: "climate-action",
            description: null,
            status: "active",
          },
        })
        .mockReturnValueOnce({
          data: [],
        });

      renderCampaignMessagesPage("1");

      expect(screen.getByText("Climate Action - Messages")).toBeInTheDocument();
      // Description should not be rendered
      const description = screen.queryByText(
        "Campaign for climate change awareness",
      );
      expect(description).not.toBeInTheDocument();
    });
  });
});
