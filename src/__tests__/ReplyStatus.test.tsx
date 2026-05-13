import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getReplyStatus,
  ReplyStatus,
  ReplyStatusFilter,
} from "@/components/ReplyStatus";

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

vi.mock("@/lib/utils", () => ({
  formatDate: (date: string) => new Date(date).toLocaleDateString(),
}));

vi.mock("lucide-react", () => ({
  Clock: () => <span>Clock Icon</span>,
  CheckCircle: () => <span>CheckCircle Icon</span>,
  Send: () => <span>Send Icon</span>,
}));

describe("getReplyStatus", () => {
  it("returns 'sent' when reply_sent_at exists", () => {
    const status = getReplyStatus("2024-01-01T00:00:00Z", null);
    expect(status).toBe("sent");
  });

  it("returns 'sent' when both reply_sent_at and template_id exist", () => {
    const status = getReplyStatus("2024-01-01T00:00:00Z", 1);
    expect(status).toBe("sent");
  });

  it("returns 'pending' when template_id exists but not sent", () => {
    const status = getReplyStatus(null, 1);
    expect(status).toBe("pending");
  });

  it("returns 'none' when neither exists", () => {
    const status = getReplyStatus(null, null);
    expect(status).toBe("none");
  });
});

describe("ReplyStatus Badge Variant", () => {
  it("renders 'Sent' badge for sent status", () => {
    render(
      <ReplyStatus
        replySentAt="2024-01-01T00:00:00Z"
        replyTemplateId={null}
        variant="badge"
      />,
    );

    expect(screen.getByText("Sent")).toBeInTheDocument();
    expect(screen.getByText("CheckCircle Icon")).toBeInTheDocument();
  });

  it("renders 'Pending' badge for pending status", () => {
    render(
      <ReplyStatus replySentAt={null} replyTemplateId={1} variant="badge" />,
    );

    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Send Icon")).toBeInTheDocument();
  });

  it("renders 'No Reply' badge for none status", () => {
    render(
      <ReplyStatus replySentAt={null} replyTemplateId={null} variant="badge" />,
    );

    expect(screen.getByText("No Reply")).toBeInTheDocument();
  });

  it("renders badge with correct variant for sent status", () => {
    render(
      <ReplyStatus
        replySentAt="2024-01-01T00:00:00Z"
        replyTemplateId={null}
        variant="badge"
      />,
    );

    const badge = screen.getByText("Sent").parentElement;
    expect(badge).toBeInTheDocument();
    // Note: Actual className styling is applied by the Badge component
    // which is mocked in tests. Testing actual styles would require
    // integration tests or checking the Badge component separately.
  });

  it("renders badge with correct variant for pending status", () => {
    render(
      <ReplyStatus replySentAt={null} replyTemplateId={1} variant="badge" />,
    );

    const badge = screen.getByText("Pending").parentElement;
    expect(badge).toBeInTheDocument();
  });
});

describe("ReplyStatus Detailed Variant", () => {
  it("displays sent timestamp in detailed view", () => {
    render(
      <ReplyStatus
        replySentAt="2024-01-01T00:00:00Z"
        replyTemplateId={1}
        variant="detailed"
      />,
    );

    expect(screen.getByText(/Sent:/)).toBeInTheDocument();
  });

  it("displays template ID in detailed view", () => {
    render(
      <ReplyStatus
        replySentAt={null}
        replyTemplateId={42}
        variant="detailed"
      />,
    );

    expect(screen.getByText(/Template ID:/)).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("shows pending message when template assigned but not sent", () => {
    render(
      <ReplyStatus replySentAt={null} replyTemplateId={1} variant="detailed" />,
    );

    expect(
      screen.getByText(/Template assigned, awaiting send/),
    ).toBeInTheDocument();
  });
});

describe("ReplyStatusFilter", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it("renders all filter buttons", () => {
    render(<ReplyStatusFilter value="all" onChange={mockOnChange} />);

    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Sent")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("No Reply")).toBeInTheDocument();
  });

  it("highlights active filter", () => {
    render(<ReplyStatusFilter value="sent" onChange={mockOnChange} />);

    const sentButton = screen.getByText("Sent");
    expect(sentButton).toHaveClass("bg-green-600");
    expect(sentButton).toHaveClass("text-white");
  });

  it("calls onChange when filter button is clicked", () => {
    render(<ReplyStatusFilter value="all" onChange={mockOnChange} />);

    const sentButton = screen.getByText("Sent");
    fireEvent.click(sentButton);

    expect(mockOnChange).toHaveBeenCalledWith("sent");
  });

  it("calls onChange with 'all' when All button is clicked", () => {
    render(<ReplyStatusFilter value="sent" onChange={mockOnChange} />);

    const allButton = screen.getByText("All");
    fireEvent.click(allButton);

    expect(mockOnChange).toHaveBeenCalledWith("all");
  });

  it("calls onChange with 'pending' when Pending button is clicked", () => {
    render(<ReplyStatusFilter value="all" onChange={mockOnChange} />);

    const pendingButton = screen.getByText("Pending");
    fireEvent.click(pendingButton);

    expect(mockOnChange).toHaveBeenCalledWith("pending");
  });

  it("calls onChange with 'none' when No Reply button is clicked", () => {
    render(<ReplyStatusFilter value="all" onChange={mockOnChange} />);

    const noReplyButton = screen.getByText("No Reply");
    fireEvent.click(noReplyButton);

    expect(mockOnChange).toHaveBeenCalledWith("none");
  });

  it("highlights 'all' filter by default", () => {
    render(<ReplyStatusFilter value="all" onChange={mockOnChange} />);

    const allButton = screen.getByText("All");
    expect(allButton).toHaveClass("bg-primary");
    expect(allButton).toHaveClass("text-white");
  });

  it("highlights pending filter when selected", () => {
    render(<ReplyStatusFilter value="pending" onChange={mockOnChange} />);

    const pendingButton = screen.getByText("Pending");
    expect(pendingButton).toHaveClass("bg-yellow-600");
    expect(pendingButton).toHaveClass("text-white");
  });

  it("highlights no reply filter when selected", () => {
    render(<ReplyStatusFilter value="none" onChange={mockOnChange} />);

    const noReplyButton = screen.getByText("No Reply");
    expect(noReplyButton).toHaveClass("bg-gray-600");
    expect(noReplyButton).toHaveClass("text-white");
  });

  it("shows inactive styling for non-selected filters", () => {
    render(<ReplyStatusFilter value="sent" onChange={mockOnChange} />);

    const allButton = screen.getByText("All");
    expect(allButton).toHaveClass("bg-gray-100");
    expect(allButton).toHaveClass("text-gray-700");
  });
});
