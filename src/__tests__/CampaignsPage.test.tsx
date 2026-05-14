import { fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { Suspense } from "react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as CampaignsPageModule from "@/pages/CampaignsPage";

const mockUseSuspenseQuery = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useSuspenseQuery: () => mockUseSuspenseQuery(),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      }),
    },
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className, ...props }: any) => (
    <span className={`badge badge-${variant} ${className || ""}`} {...props}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children, open, onOpenChange }: any) => (
    <div data-open={open} onChange={onOpenChange}>
      {children}
    </div>
  ),
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
  AlertDialogTrigger: ({ children, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/TemplateForm", () => ({
  TemplateForm: ({ onSuccess, onCancel, initialData }: any) => (
    <div data-testid="template-form">
      <div data-testid="template-form-data">{JSON.stringify(initialData)}</div>
      <button type="button" onClick={onSuccess}>
        Success
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
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

  it("renders campaign rows with data including message counts and template status", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [
        {
          id: 1,
          name: "Climate Action",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
          hasReplyTemplate: true,
          templateId: 10,
          replyTemplateCount: 1,
          activeReplyTemplateCount: 1,
          messageCount: 25,
        },
        {
          id: 2,
          name: "Education Reform",
          created_at: "2024-02-01T00:00:00Z",
          updated_at: "2024-02-02T00:00:00Z",
          hasReplyTemplate: false,
          replyTemplateCount: 0,
          activeReplyTemplateCount: 0,
          messageCount: 0,
        },
      ],
    });

    renderCampaignsPage();

    expect(screen.getByText("Climate Action")).toBeInTheDocument();
    expect(screen.getByText("Education Reform")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    // Check message counts
    expect(screen.getByText("25 messages")).toBeInTheDocument();
    expect(screen.getByText("0 messages")).toBeInTheDocument();

    // Check template status badges are clickable
    expect(screen.getByText("Template Exists")).toBeInTheDocument();
    expect(screen.getByText("No Template")).toBeInTheDocument();

    // Verify badges are present (no Actions column anymore)
    const templateExistsBadge = screen
      .getByText("Template Exists")
      .closest(".badge");
    const noTemplateBadge = screen.getByText("No Template").closest(".badge");
    expect(templateExistsBadge).toBeInTheDocument();
    expect(noTemplateBadge).toBeInTheDocument();
  });

  it("navigates to campaign messages page when a campaign data cell is clicked", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [
        {
          id: 42,
          name: "Climate Action",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
          hasReplyTemplate: true,
          templateId: 99,
          replyTemplateCount: 1,
          activeReplyTemplateCount: 1,
          messageCount: 10,
        },
      ],
    });

    renderCampaignsPage();

    const campaignNameCell = screen.getByText("Climate Action");
    fireEvent.click(campaignNameCell);

    expect(mockNavigate).toHaveBeenCalledWith("/campaigns/42");
  });

  it("opens create template dialog when No Template badge is clicked", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [
        {
          id: 2,
          name: "Education Reform",
          created_at: "2024-02-01T00:00:00Z",
          updated_at: "2024-02-02T00:00:00Z",
          hasReplyTemplate: false,
          replyTemplateCount: 0,
          activeReplyTemplateCount: 0,
          messageCount: 0,
        },
      ],
    });

    renderCampaignsPage();

    // Click the "No Template" badge to open create dialog
    const noTemplateBadge = screen.getByText("No Template");
    fireEvent.click(noTemplateBadge);

    // Check that the dialog opens and TemplateForm is rendered
    expect(screen.getByTestId("template-form")).toBeInTheDocument();
    expect(screen.getByText("Create Reply Template")).toBeInTheDocument();

    // Check that the form is pre-populated with the campaign ID
    const formData = screen.getByTestId("template-form-data");
    expect(formData.textContent).toContain('"campaign_id":2');
  });

  it("does not show Create Reply Template button for campaigns with existing templates", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [
        {
          id: 1,
          name: "Climate Action",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
          hasReplyTemplate: true,
          templateId: 10,
          replyTemplateCount: 1,
          activeReplyTemplateCount: 1,
          messageCount: 25,
        },
      ],
    });

    renderCampaignsPage();

    expect(
      screen.queryByRole("button", { name: /create reply template/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Template Exists")).toBeInTheDocument();
  });

  it("handles singular and plural message count display correctly", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [
        {
          id: 1,
          name: "Single Message",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
          hasReplyTemplate: false,
          replyTemplateCount: 0,
          activeReplyTemplateCount: 0,
          messageCount: 1,
        },
        {
          id: 2,
          name: "Multiple Messages",
          created_at: "2024-02-01T00:00:00Z",
          updated_at: "2024-02-02T00:00:00Z",
          hasReplyTemplate: false,
          replyTemplateCount: 0,
          activeReplyTemplateCount: 0,
          messageCount: 5,
        },
      ],
    });

    renderCampaignsPage();

    expect(screen.getByText("1 message")).toBeInTheDocument();
    expect(screen.getByText("5 messages")).toBeInTheDocument();
  });

  it("applies hover styles to campaign rows", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [
        {
          id: 1,
          name: "Climate Action",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
          hasReplyTemplate: true,
          templateId: 10,
          replyTemplateCount: 1,
          activeReplyTemplateCount: 1,
          messageCount: 10,
        },
      ],
    });

    renderCampaignsPage();

    const campaignRow = screen.getByText("Climate Action").closest("tr");
    expect(campaignRow).toHaveClass("cursor-pointer");
    expect(campaignRow).toHaveClass("hover:bg-gray-50");
  });

  it("shows aggregate template label when a campaign has multiple templates", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [
        {
          id: 1,
          name: "Multi Template Campaign",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
          hasReplyTemplate: true,
          templateId: 50,
          replyTemplateCount: 3,
          activeReplyTemplateCount: 1,
          messageCount: 2,
        },
      ],
    });

    renderCampaignsPage();

    expect(screen.getByText("3 templates (1 active)")).toBeInTheDocument();
  });
});
