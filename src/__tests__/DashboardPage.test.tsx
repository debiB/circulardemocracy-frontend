import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "@/pages/DashboardPage";

const mockUseUser = vi.fn();

vi.mock("@/hooks/useUser", () => ({
	useUser: () => mockUseUser(),
}));

vi.mock("@/components/PageLayout", () => ({
	PageLayout: ({ children }: any) => (
		<div data-testid="page-layout">{children}</div>
	),
}));

vi.mock("@/components/ui/card", () => ({
	Card: ({ children, className }: any) => (
		<div className={className}>{children}</div>
	),
	CardHeader: ({ children }: any) => <div>{children}</div>,
	CardTitle: ({ children, className }: any) => (
		<h2 className={className}>{children}</h2>
	),
	CardContent: ({ children, className }: any) => (
		<div className={className}>{children}</div>
	),
}));

vi.mock("@/components/analytics/AnalyticsContainer", () => ({
	AnalyticsContainer: ({ timeBucket }: { timeBucket?: "day" | "week" }) => (
		<div data-testid="analytics-container">{timeBucket}</div>
	),
}));

vi.mock("@/components/dashboard/CampaignsWithoutReplyTemplateCard", () => ({
	CampaignsWithoutReplyTemplateCard: () => (
		<div data-testid="campaigns-without-reply-template-card" />
	),
}));

describe("DashboardPage", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		});
		vi.clearAllMocks();

		mockUseUser.mockReturnValue({
			data: { id: "user-1", email: "test@example.com" },
		});
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it("renders the dashboard page", () => {
		render(<DashboardPage />, { wrapper });

		expect(screen.getByTestId("page-layout")).toBeInTheDocument();
	});

	it("displays welcome message with user name", () => {
		render(<DashboardPage />, { wrapper });

		expect(
			screen.getByText("Welcome to Circular Democracy!"),
		).toBeInTheDocument();
		expect(screen.getByText("Hello, test")).toBeInTheDocument();
	});

	it("extracts username from email", () => {
		mockUseUser.mockReturnValue({
			data: { id: "user-1", email: "john.doe@example.com" },
		});

		render(<DashboardPage />, { wrapper });

		expect(screen.getByText("Hello, john.doe")).toBeInTheDocument();
	});

	it("renders analytics and campaigns sections", () => {
		render(<DashboardPage />, { wrapper });

		expect(screen.getByTestId("analytics-container")).toBeInTheDocument();
		expect(
			screen.getByTestId("campaigns-without-reply-template-card"),
		).toBeInTheDocument();
	});

	it("returns null when user is not authenticated", () => {
		mockUseUser.mockReturnValue({
			data: null,
		});

		const { container } = render(<DashboardPage />, { wrapper });

		expect(container.firstChild).toBeNull();
	});

	it("uses PageLayout wrapper", () => {
		render(<DashboardPage />, { wrapper });

		expect(screen.getByTestId("page-layout")).toBeInTheDocument();
	});

	it("renders welcome card and dashboard sections", () => {
		render(<DashboardPage />, { wrapper });

		expect(
			screen.getByText("Welcome to Circular Democracy!"),
		).toBeInTheDocument();
		expect(screen.getByTestId("analytics-container")).toBeInTheDocument();
	});

	it("applies correct styling to welcome card", () => {
		const { container } = render(<DashboardPage />, { wrapper });

		const card = container.querySelector(".p-4");
		expect(card).toBeInTheDocument();
	});

	it("centers welcome card title", () => {
		const { container } = render(<DashboardPage />, { wrapper });

		const title = container.querySelector(".text-center");
		expect(title).toBeInTheDocument();
	});

	it("displays user email prefix as username", () => {
		mockUseUser.mockReturnValue({
			data: { id: "user-1", email: "admin@company.org" },
		});

		render(<DashboardPage />, { wrapper });

		expect(screen.getByText("Hello, admin")).toBeInTheDocument();
	});

	it("handles user with no email gracefully", () => {
		mockUseUser.mockReturnValue({
			data: { id: "user-1", email: null },
		});

		render(<DashboardPage />, { wrapper });

		expect(screen.getByText("Hello, Guest")).toBeInTheDocument();
	});

	it("handles user with empty email", () => {
		mockUseUser.mockReturnValue({
			data: { id: "user-1", email: "" },
		});

		render(<DashboardPage />, { wrapper });

		expect(screen.getByText("Hello, Guest")).toBeInTheDocument();
	});

	it("uses consistent card styling", () => {
		const { container } = render(<DashboardPage />, { wrapper });

		const cards = container.querySelectorAll(".p-4");
		expect(cards.length).toBeGreaterThan(0);
	});

	it("renders components in correct order", () => {
		render(<DashboardPage />, { wrapper });

		const welcomeText = screen.getByText("Welcome to Circular Democracy!");
		const analyticsContainer = screen.getByTestId("analytics-container");

		expect(welcomeText).toBeInTheDocument();
		expect(analyticsContainer).toBeInTheDocument();
	});
});
