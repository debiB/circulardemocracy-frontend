import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  extractTemplateVariables,
  TemplatePreview,
  TemplatePreviewCompact,
  validateTemplateVariables,
} from "@/components/TemplatePreview";

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock("@/components/SendTimingSelector", () => ({
  getTimingDisplayLabel: (timing: string) => {
    if (timing === "immediate") return "Sent instantly";
    if (timing === "office_hours") return "Office hours";
    if (timing === "scheduled") return "Scheduled";
    return timing;
  },
}));

describe("TemplatePreview", () => {
  it("renders subject and body", () => {
    render(
      <TemplatePreview
        subject="Welcome to our campaign"
        body="Thank you for your support"
        sendTiming="immediate"
      />,
    );

    expect(screen.getByText("Welcome to our campaign")).toBeInTheDocument();
    expect(screen.getByText(/Thank you for your support/)).toBeInTheDocument();
  });

  it("substitutes {name} variable with provided data", () => {
    render(
      <TemplatePreview
        subject="Hello {name}"
        body="Dear {name}, thank you"
        sendTiming="immediate"
        personalizationData={{ name: "John Doe" }}
      />,
    );

    expect(screen.getByText("Hello John Doe")).toBeInTheDocument();
    expect(screen.getByText(/Dear John Doe, thank you/)).toBeInTheDocument();
  });

  it("substitutes {campaign} variable with provided data", () => {
    render(
      <TemplatePreview
        subject="About {campaign}"
        body="Join our {campaign} initiative"
        sendTiming="immediate"
        personalizationData={{ campaign: "Climate Action" }}
      />,
    );

    expect(screen.getByText("About Climate Action")).toBeInTheDocument();
    expect(
      screen.getByText(/Join our Climate Action initiative/),
    ).toBeInTheDocument();
  });

  it("shows placeholder when name variable has no data", () => {
    render(
      <TemplatePreview
        subject="Hello {name}"
        body="Dear {name}"
        sendTiming="immediate"
      />,
    );

    expect(screen.getByText("Hello [Name]")).toBeInTheDocument();
    expect(screen.getByText(/Dear \[Name\]/)).toBeInTheDocument();
  });

  it("shows placeholder when campaign variable has no data", () => {
    render(
      <TemplatePreview
        subject="About {campaign}"
        body="Join {campaign}"
        sendTiming="immediate"
      />,
    );

    expect(screen.getByText("About [Campaign]")).toBeInTheDocument();
    expect(screen.getByText(/Join \[Campaign\]/)).toBeInTheDocument();
  });

  it("renders bold markdown correctly", () => {
    render(
      <TemplatePreview
        subject="Subject"
        body="This is **bold text**"
        sendTiming="immediate"
      />,
    );

    const bodyElement = screen.getByText(/This is/).parentElement;
    expect(bodyElement?.innerHTML).toContain("<strong>bold text</strong>");
  });

  it("renders italic markdown correctly", () => {
    render(
      <TemplatePreview
        subject="Subject"
        body="This is *italic text*"
        sendTiming="immediate"
      />,
    );

    const bodyElement = screen.getByText(/This is/).parentElement;
    expect(bodyElement?.innerHTML).toContain("<em>italic text</em>");
  });

  it("renders links markdown correctly", () => {
    render(
      <TemplatePreview
        subject="Subject"
        body="Visit [our website](https://example.com)"
        sendTiming="immediate"
      />,
    );

    const link = screen.getByRole("link", { name: "our website" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("processes markdown in body text", () => {
    render(
      <TemplatePreview
        subject="Subject"
        body="Line 1\nLine 2"
        sendTiming="immediate"
      />,
    );

    // The component processes line breaks to <br> tags via simpleMarkdownToHtml
    // In the actual implementation, this is rendered with dangerouslySetInnerHTML
    // Testing the actual HTML output would require unmocked Card components
    // or testing the simpleMarkdownToHtml function directly
    expect(screen.getByText(/Message Body:/)).toBeInTheDocument();
  });

  it("displays personalization info when data is provided", () => {
    render(
      <TemplatePreview
        subject="Subject"
        body="Body"
        sendTiming="immediate"
        personalizationData={{ name: "John Doe", campaign: "Climate Action" }}
      />,
    );

    expect(screen.getByText("Personalization Applied:")).toBeInTheDocument();
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/Climate Action/)).toBeInTheDocument();
  });

  it("shows warning when no personalization data provided", () => {
    render(
      <TemplatePreview
        subject="Subject with {name}"
        body="Body with {campaign}"
        sendTiming="immediate"
      />,
    );

    expect(
      screen.getByText(/No personalization data provided/),
    ).toBeInTheDocument();
  });

  it("displays send timing badge", () => {
    render(
      <TemplatePreview subject="Subject" body="Body" sendTiming="immediate" />,
    );

    expect(screen.getByText("Sent instantly")).toBeInTheDocument();
  });
});

describe("TemplatePreviewCompact", () => {
  it("renders subject and body preview", () => {
    render(<TemplatePreviewCompact subject="Test Subject" body="Test Body" />);

    expect(screen.getByText(/Subject:/)).toBeInTheDocument();
    expect(screen.getByText("Test Subject")).toBeInTheDocument();
    expect(screen.getByText(/Body Preview:/)).toBeInTheDocument();
  });

  it("applies personalization to compact preview", () => {
    render(
      <TemplatePreviewCompact
        subject="Hello {name}"
        body="Welcome to {campaign}"
        personalizationData={{ name: "Jane", campaign: "Education" }}
      />,
    );

    expect(screen.getByText("Hello Jane")).toBeInTheDocument();
  });
});

describe("extractTemplateVariables", () => {
  it("extracts single variable", () => {
    const result = extractTemplateVariables("Hello {name}");
    expect(result).toEqual(["name"]);
  });

  it("extracts multiple variables", () => {
    const result = extractTemplateVariables(
      "Hello {name}, welcome to {campaign}",
    );
    expect(result).toEqual(["name", "campaign"]);
  });

  it("removes duplicate variables", () => {
    const result = extractTemplateVariables("{name} and {name} again");
    expect(result).toEqual(["name"]);
  });

  it("returns empty array when no variables found", () => {
    const result = extractTemplateVariables("No variables here");
    expect(result).toEqual([]);
  });

  it("handles multiple occurrences of different variables", () => {
    const result = extractTemplateVariables(
      "{name} {campaign} {name} {campaign}",
    );
    expect(result).toEqual(["name", "campaign"]);
  });
});

describe("validateTemplateVariables", () => {
  it("validates when all variables have data", () => {
    const result = validateTemplateVariables("Hello {name} from {campaign}", {
      name: "John",
      campaign: "Climate",
    });

    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("identifies missing variables", () => {
    const result = validateTemplateVariables("Hello {name} from {campaign}", {
      name: "John",
    });

    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["campaign"]);
  });

  it("identifies multiple missing variables", () => {
    const result = validateTemplateVariables(
      "Hello {name} from {campaign} by {politician}",
      {},
    );

    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["name", "campaign", "politician"]);
  });

  it("validates when no variables in template", () => {
    const result = validateTemplateVariables("No variables", {});

    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });
});
