import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getTimingDisplayLabel,
  SendTimingSelector,
} from "@/components/SendTimingSelector";

vi.mock("@/components/ui/field", () => ({
  Field: ({ children }: any) => <div>{children}</div>,
  FieldLabel: ({ children, htmlFor }: any) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
  FieldDescription: ({ children }: any) => <div>{children}</div>,
  FieldError: ({ children }: any) => <div role="alert">{children}</div>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select-wrapper">
      <select
        data-testid="timing-select"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <div>Select Value</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <option value={value}>{children}</option>
  ),
}));

describe("SendTimingSelector", () => {
  const mockOnValueChange = vi.fn();
  const mockOnScheduledDateTimeChange = vi.fn();

  beforeEach(() => {
    mockOnValueChange.mockClear();
    mockOnScheduledDateTimeChange.mockClear();
  });

  it("renders timing selector with all options", () => {
    render(
      <SendTimingSelector
        value="immediate"
        onValueChange={mockOnValueChange}
      />,
    );

    expect(screen.getByText("Send Timing *")).toBeInTheDocument();
    expect(screen.getByText(/Immediate - Sent instantly/)).toBeInTheDocument();
    expect(screen.getByText(/Office Hours/)).toBeInTheDocument();
    expect(screen.getByText(/Scheduled/)).toBeInTheDocument();
  });

  it("displays correct description for immediate timing", () => {
    render(
      <SendTimingSelector
        value="immediate"
        onValueChange={mockOnValueChange}
      />,
    );

    expect(
      screen.getByText(/Messages will be sent instantly upon receipt/),
    ).toBeInTheDocument();
  });

  it("displays correct description for office_hours timing", () => {
    render(
      <SendTimingSelector
        value="office_hours"
        onValueChange={mockOnValueChange}
      />,
    );

    expect(
      screen.getByText(
        /Messages will be sent during office hours \(8:00–19:00 CEST\)/,
      ),
    ).toBeInTheDocument();
  });

  it("displays correct description for scheduled timing", () => {
    render(
      <SendTimingSelector
        value="scheduled"
        onValueChange={mockOnValueChange}
      />,
    );

    expect(
      screen.getByText(/Messages will be sent at the scheduled date and time/),
    ).toBeInTheDocument();
  });

  it("calls onValueChange when timing option is changed", () => {
    render(
      <SendTimingSelector
        value="immediate"
        onValueChange={mockOnValueChange}
      />,
    );

    const select = screen.getByTestId("timing-select");
    fireEvent.change(select, { target: { value: "office_hours" } });

    expect(mockOnValueChange).toHaveBeenCalledWith("office_hours");
  });

  it("shows datetime picker when scheduled is selected", () => {
    render(
      <SendTimingSelector
        value="scheduled"
        onValueChange={mockOnValueChange}
        onScheduledDateTimeChange={mockOnScheduledDateTimeChange}
        scheduledDateTime=""
      />,
    );

    expect(screen.getByLabelText("Scheduled Date & Time")).toBeInTheDocument();
    const datetimeInput = document.querySelector(
      'input[type="datetime-local"]',
    );
    expect(datetimeInput).toBeInTheDocument();
  });

  it("does not show datetime picker when immediate is selected", () => {
    render(
      <SendTimingSelector
        value="immediate"
        onValueChange={mockOnValueChange}
      />,
    );

    expect(
      screen.queryByLabelText("Scheduled Date & Time"),
    ).not.toBeInTheDocument();
  });

  it("does not show datetime picker when office_hours is selected", () => {
    render(
      <SendTimingSelector
        value="office_hours"
        onValueChange={mockOnValueChange}
      />,
    );

    expect(
      screen.queryByLabelText("Scheduled Date & Time"),
    ).not.toBeInTheDocument();
  });

  it("hides datetime picker when showScheduledInput is false", () => {
    render(
      <SendTimingSelector
        value="scheduled"
        onValueChange={mockOnValueChange}
        showScheduledInput={false}
      />,
    );

    expect(
      screen.queryByLabelText("Scheduled Date & Time"),
    ).not.toBeInTheDocument();
  });

  it("calls onScheduledDateTimeChange when datetime is changed", () => {
    render(
      <SendTimingSelector
        value="scheduled"
        onValueChange={mockOnValueChange}
        onScheduledDateTimeChange={mockOnScheduledDateTimeChange}
        scheduledDateTime=""
      />,
    );

    const datetimeInput = document.querySelector(
      'input[type="datetime-local"]',
    ) as HTMLInputElement;
    fireEvent.change(datetimeInput, {
      target: { value: "2024-12-01T10:00" },
    });

    expect(mockOnScheduledDateTimeChange).toHaveBeenCalledWith(
      "2024-12-01T10:00",
    );
  });

  it("displays error message when provided", () => {
    render(
      <SendTimingSelector
        value="immediate"
        onValueChange={mockOnValueChange}
        error="This field is required"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This field is required",
    );
  });

  it("populates datetime input with provided value", () => {
    render(
      <SendTimingSelector
        value="scheduled"
        onValueChange={mockOnValueChange}
        onScheduledDateTimeChange={mockOnScheduledDateTimeChange}
        scheduledDateTime="2024-12-01T10:00"
      />,
    );

    const datetimeInput = document.querySelector(
      'input[type="datetime-local"]',
    ) as HTMLInputElement;
    expect(datetimeInput).toHaveValue("2024-12-01T10:00");
  });
});

describe("getTimingDisplayLabel", () => {
  it("returns correct label for immediate timing", () => {
    expect(getTimingDisplayLabel("immediate")).toBe("Sent instantly");
  });

  it("returns correct label for office_hours timing", () => {
    expect(getTimingDisplayLabel("office_hours")).toBe(
      "Sent during office hours (8:00–19:00 CEST)",
    );
  });

  it("returns correct label for scheduled timing without date", () => {
    expect(getTimingDisplayLabel("scheduled")).toBe("Scheduled");
  });

  it("returns formatted label for scheduled timing with date", () => {
    const result = getTimingDisplayLabel("scheduled", "2024-12-01T10:00:00Z");
    expect(result).toContain("Scheduled for");
  });

  it("handles invalid date gracefully", () => {
    const result = getTimingDisplayLabel("scheduled", "invalid-date");
    expect(result).toContain("Scheduled for");
  });
});
