import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import App from "./App.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { getSupabaseError } from "./lib/supabase.ts";

const supabaseInitializationError = getSupabaseError();
const queryClient = new QueryClient();

if (supabaseInitializationError) {
	createRoot(document.getElementById("root")!).render(
		<div
			style={{
				padding: "20px",
				color: "red",
				backgroundColor: "#fee",
				border: "1px solid red",
			}}
		>
			<h1>Configuration Error</h1>
			<p>{supabaseInitializationError}</p>
			<p>
				Please set your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment
				variables.
			</p>
		</div>,
	);
} else {
	createRoot(document.getElementById("root")!).render(
		<StrictMode>
			<ErrorBoundary>
				<QueryClientProvider client={queryClient}>
					<TooltipProvider delayDuration={200}>
						<BrowserRouter>
							<AuthProvider>
								<App />
								<Toaster />
							</AuthProvider>
						</BrowserRouter>
					</TooltipProvider>
					<ReactQueryDevtools initialIsOpen={false} />
				</QueryClientProvider>
			</ErrorBoundary>
		</StrictMode>,
	);
}
