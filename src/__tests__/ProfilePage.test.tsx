import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as ProfilePageModule from "@/pages/ProfilePage";

const mockUseUserValue = {
  data: { id: "user-1", email: "user@example.org" },
};

const mockUseUser = vi.fn<() => { data: { id: string; email: string } | null }>(
  () => mockUseUserValue,
);

const mockUseSuspenseQuery = vi.fn();
const mockInvalidateQueries = vi.fn();

const mockUpsert = vi.fn();
const mockFrom = vi.fn<(table: string) => { upsert: typeof mockUpsert }>(
  () => ({
    upsert: mockUpsert,
  }),
);

const mockToast = vi.fn();

const ProfilePageComponent =
  (ProfilePageModule as { ProfilePage?: React.ComponentType }).ProfilePage ??
  (ProfilePageModule as { default?: React.ComponentType }).default!;

vi.mock("@/hooks/useUser", () => ({
  useUser: () => mockUseUser(),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useSuspenseQuery: () => mockUseSuspenseQuery(),
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
  getSupabase: () => ({
    from: (table: string) => mockFrom(table),
  }),
}));

vi.mock("sonner", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
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

vi.mock("@/components/ui/input", () => ({
  Input: ({ label, errorMessage, ...props }: any) => (
    <div>
      {label ? (
        <label>
          {label}
          <input {...props} />
        </label>
      ) : (
        <input {...props} />
      )}
      {errorMessage && <span>{errorMessage}</span>}
    </div>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} />
  ),
}));

function renderProfilePage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfilePageComponent />
    </QueryClientProvider>,
  );
}

describe("ProfilePage", () => {
  beforeEach(() => {
    mockUseUser.mockReturnValue(mockUseUserValue);
    mockUseSuspenseQuery.mockReset();
    mockInvalidateQueries.mockReset();
    mockUpsert.mockReset();
    mockFrom.mockClear();
    mockToast.mockClear();
  });

  it("does not render when there is no current user (permissions)", () => {
    mockUseUser.mockReturnValue({ data: null });

    const { container } = renderProfilePage();

    expect(container.firstChild).toBeNull();
  });

  it("shows validation errors when required fields are empty", async () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: { firstname: "", lastname: "", job_title: "" },
    });

    renderProfilePage();

    const submitButton = screen.getByRole("button", { name: /save profile/i });
    fireEvent.click(submitButton);

    await screen.findByText("First name is required");
    await screen.findByText("Last name is required");
    await screen.findByText("Job title is required");

    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("submits profile data and shows success toast on success", async () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: {
        firstname: "Existing",
        lastname: "User",
        job_title: "Member",
      },
    });

    mockUpsert.mockResolvedValue({ error: null });

    renderProfilePage();

    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    const jobTitleInput = screen.getByLabelText(/job title/i);

    fireEvent.change(firstNameInput, { target: { value: "Ada" } });
    fireEvent.change(lastNameInput, { target: { value: "Lovelace" } });
    fireEvent.change(jobTitleInput, { target: { value: "Engineer" } });

    const submitButton = screen.getByRole("button", { name: /save profile/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("profiles");
      expect(mockUpsert).toHaveBeenCalledWith(
        {
          id: "user-1",
          firstname: "Ada",
          lastname: "Lovelace",
          job_title: "Engineer",
        },
        { onConflict: "id" },
      );
      expect(mockInvalidateQueries).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalled();
    });
  });

  it("shows an inline error when the save fails", async () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: {
        firstname: "Existing",
        lastname: "User",
        job_title: "Member",
      },
    });

    mockUpsert.mockResolvedValue({
      error: { message: "Failed to save profile" },
    });

    renderProfilePage();

    const submitButton = screen.getByRole("button", { name: /save profile/i });
    fireEvent.click(submitButton);

    await screen.findByText("Failed to save profile");

    expect(mockToast).not.toHaveBeenCalled();
  });
});
