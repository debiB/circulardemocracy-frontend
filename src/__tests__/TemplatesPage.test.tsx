import React, { Suspense } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import * as TemplatesPageModule from "@/pages/TemplatesPage";

const mockUseSuspenseQuery = vi.fn();
const mockFetch = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useSuspenseQuery: () => mockUseSuspenseQuery(),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
  useMutation: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
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
    <h2>{children}</h2>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-variant={variant}>{children}</span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant }: any) => (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: any) => <div>{children}</div>,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h3>{children}</h3>,
  AlertDialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/TemplateForm", () => ({
  TemplateForm: ({ initialData, onSuccess, onCancel }: any) => (
    <div data-testid="template-form">
      <div>Template Form</div>
      {initialData && <div data-testid="edit-mode">Edit Mode</div>}
      {!initialData && <div data-testid="create-mode">Create Mode</div>}
      <button onClick={onSuccess}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock("lucide-react", () => ({
  Plus: () => <span>Plus Icon</span>,
  Edit: () => <span>Edit Icon</span>,
}));

global.fetch = mockFetch;

const TemplatesPageComponent =
  (TemplatesPageModule as { TemplatesPage?: React.ComponentType })
    .TemplatesPage ??
  (TemplatesPageModule as { default?: React.ComponentType }).default!;

function renderTemplatesPage() {
  return render(
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <TemplatesPageComponent />
      </Suspense>
    </BrowserRouter>,
  );
}

describe("TemplatesPage", () => {
  beforeEach(() => {
    mockUseSuspenseQuery.mockReset();
    mockFetch.mockReset();
  });

  it("renders the page title and description", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [],
    });

    renderTemplatesPage();

    expect(screen.getByText("Reply Templates")).toBeInTheDocument();
    expect(
      screen.getByText(/Manage your automated reply templates/i),
    ).toBeInTheDocument();
  });

  it("shows empty state when no templates exist", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [],
    });

    renderTemplatesPage();

    expect(
      screen.getByText(/No reply templates found/i),
    ).toBeInTheDocument();
  });

  it("renders templates grouped by campaign", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [
        {
          id: 1,
          campaign_id: 1,
          name: "Welcome Email",
          subject: "Thank you for your message",
          body: "We appreciate your support",
          active: true,
          send_timing: "immediate",
          scheduled_for: null,
          campaign: { id: 1, name: "Climate Action" },
        },
        {
          id: 2,
          campaign_id: 1,
          name: "Follow-up Email",
          subject: "Following up",
          body: "Just checking in",
          active: false,
          send_timing: "office_hours",
          scheduled_for: null,
          campaign: { id: 1, name: "Climate Action" },
        },
        {
          id: 3,
          campaign_id: 2,
          name: "Auto Reply",
          subject: "Thanks",
          body: "We got your message",
          active: true,
          send_timing: "scheduled",
          scheduled_for: "2024-12-01T10:00:00Z",
          campaign: { id: 2, name: "Education Reform" },
        },
      ],
    });

    renderTemplatesPage();

    expect(screen.getByText("Climate Action")).toBeInTheDocument();
    expect(screen.getByText("Education Reform")).toBeInTheDocument();
    expect(screen.getByText("Welcome Email")).toBeInTheDocument();
    expect(screen.getByText("Follow-up Email")).toBeInTheDocument();
    expect(screen.getByText("Auto Reply")).toBeInTheDocument();
  });

  it("displays template count per campaign", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [
        {
          id: 1,
          campaign_id: 1,
          name: "Template 1",
          subject: "Subject 1",
          body: "Body 1",
          active: true,
          send_timing: "immediate",
          campaign: { id: 1, name: "Climate Action" },
        },
        {
          id: 2,
          campaign_id: 1,
          name: "Template 2",
          subject: "Subject 2",
          body: "Body 2",
          active: true,
          send_timing: "immediate",
          campaign: { id: 1, name: "Climate Action" },
        },
      ],
    });

    renderTemplatesPage();

    expect(screen.getByText("2 templates")).toBeInTheDocument();
  });

  it("displays active/inactive status badges", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [
        {
          id: 1,
          campaign_id: 1,
          name: "Active Template",
          subject: "Subject",
          body: "Body",
          active: true,
          send_timing: "immediate",
          campaign: { id: 1, name: "Test Campaign" },
        },
        {
          id: 2,
          campaign_id: 1,
          name: "Inactive Template",
          subject: "Subject",
          body: "Body",
          active: false,
          send_timing: "immediate",
          campaign: { id: 1, name: "Test Campaign" },
        },
      ],
    });

    renderTemplatesPage();

    const badges = screen.getAllByText(/Active|Inactive/);
    expect(badges.length).toBeGreaterThan(0);
  });

  it("displays send timing information", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [
        {
          id: 1,
          campaign_id: 1,
          name: "Template",
          subject: "Subject",
          body: "Body",
          active: true,
          send_timing: "immediate",
          campaign: { id: 1, name: "Test Campaign" },
        },
      ],
    });

    renderTemplatesPage();

    expect(screen.getByText(/Timing:/i)).toBeInTheDocument();
  });

  it("shows Create Template button", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [],
    });

    renderTemplatesPage();

    expect(screen.getByText("Create Template")).toBeInTheDocument();
  });

  it("opens create dialog when Create Template button is clicked", async () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [],
    });

    renderTemplatesPage();

    const createButton = screen.getByText("Create Template");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Create New Template")).toBeInTheDocument();
      expect(screen.getByTestId("create-mode")).toBeInTheDocument();
    });
  });

  it("shows Edit button for each template", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [
        {
          id: 1,
          campaign_id: 1,
          name: "Template",
          subject: "Subject",
          body: "Body",
          active: true,
          send_timing: "immediate",
          campaign: { id: 1, name: "Test Campaign" },
        },
      ],
    });

    renderTemplatesPage();

    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("opens edit dialog when Edit button is clicked", async () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [
        {
          id: 1,
          campaign_id: 1,
          name: "Template",
          subject: "Subject",
          body: "Body",
          active: true,
          send_timing: "immediate",
          campaign: { id: 1, name: "Test Campaign" },
        },
      ],
    });

    renderTemplatesPage();

    const editButton = screen.getByText("Edit");
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText("Edit Template")).toBeInTheDocument();
      expect(screen.getByTestId("edit-mode")).toBeInTheDocument();
    });
  });

  it("displays template subject line", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [
        {
          id: 1,
          campaign_id: 1,
          name: "Template",
          subject: "Thank you for your support",
          body: "Body",
          active: true,
          send_timing: "immediate",
          campaign: { id: 1, name: "Test Campaign" },
        },
      ],
    });

    renderTemplatesPage();

    expect(screen.getByText("Thank you for your support")).toBeInTheDocument();
  });
});
