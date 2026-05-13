import { render, screen } from "@testing-library/react";
import type React from "react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as UsersPageModule from "@/pages/UsersPage";

const mockUseSuspenseQuery = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useSuspenseQuery: () => mockUseSuspenseQuery(),
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
    <div>{children}</div>
  ),
}));

const UsersPageComponent =
  (UsersPageModule as { UsersPage?: React.ComponentType }).UsersPage ??
  (UsersPageModule as { default?: React.ComponentType }).default!;

function renderUsersPage() {
  return render(
    <Suspense fallback={<div>Loading...</div>}>
      <UsersPageComponent />
    </Suspense>,
  );
}

describe("UsersPage", () => {
  beforeEach(() => {
    mockUseSuspenseQuery.mockReset();
  });

  it("shows a message when there are no team members", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [],
    });

    renderUsersPage();

    expect(screen.getByText(/no team members found/i)).toBeInTheDocument();
  });

  it("renders staff rows with profile information", () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: [
        {
          user_id: "user-1",
          role: "admin",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
          profile: {
            firstname: "Ada",
            lastname: "Lovelace",
            job_title: "Engineer",
          },
        },
      ],
    });

    renderUsersPage();

    expect(screen.getByText("user-1")).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Engineer")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });
});
