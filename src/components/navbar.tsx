import { Link } from "react-router-dom"; // Import Link
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/hooks/useUser"; // Import useUser hook

export function Navbar() {
	const { user: authUser, signOut } = useAuth();
	const { data: currentUser } = useUser(); // Fetch current user from Supabase via hook

	const handleLogout = async () => {
		try {
			await signOut();
			// Optionally redirect or show a message, Navigate will handle it via AuthProvider
		} catch (error) {
			console.error("Error signing out:", error);
		}
	};

	const displayUserName = currentUser?.email
		? currentUser.email.split("@")[0]
		: "Guest";

	return (
		<NavigationMenu className="fixed top-0 left-0 w-full max-w-none flex items-center justify-between p-4 border-b border-gray-200 z-50 bg-white">
			<div className="flex items-center">
				<Link
					to="/"
					className="flex items-center space-x-2 dark:text-white text-2xl md:text-xl ml-2 rtl:ml-0 rtl:mr-2 self-center text-gray-900 whitespace-nowrap"
				>
					<img src={logo} alt="Circular Democracy Logo" className="h-8" />
					<span className="font-bold hidden md:block">Circular Democracy</span>
				</Link>
			</div>
			<NavigationMenuList className="flex items-center space-x-4">
				{authUser && (
					<>
						<NavigationMenuItem>
							<NavigationMenuLink asChild>
								<Link
									to="/campaigns"
									className="font-medium text-gray-700 hover:text-gray-900"
								>
									Campaigns
								</Link>
							</NavigationMenuLink>
						</NavigationMenuItem>
						<NavigationMenuItem>
							<NavigationMenuLink asChild>
								<Link
									to="/users"
									className="font-medium text-gray-700 hover:text-gray-900"
								>
									Team
								</Link>
							</NavigationMenuLink>
						</NavigationMenuItem>
						<NavigationMenuItem>
							<NavigationMenuLink asChild>
								<Link
									to="/analytics"
									className="font-medium text-gray-700 hover:text-gray-900"
								>
									Analytics
								</Link>
							</NavigationMenuLink>
						</NavigationMenuItem>
						<NavigationMenuItem>
							<NavigationMenuLink asChild>
								<Link
									to="/profile"
									className="font-medium text-gray-700 hover:text-gray-900"
								>
									Profile
								</Link>
							</NavigationMenuLink>
						</NavigationMenuItem>
						<NavigationMenuItem>
							<NavigationMenuLink asChild>
								<Link
									to="/contact"
									className="font-medium text-gray-700 hover:text-gray-900"
								>
									Help
								</Link>
							</NavigationMenuLink>
						</NavigationMenuItem>
						<NavigationMenuItem className="font-medium text-gray-700">
							Hello, {displayUserName}
						</NavigationMenuItem>
					</>
				)}
				{!authUser && (
					<>
						<NavigationMenuItem>
							<NavigationMenuLink asChild>
								<Link
									to="/login"
									className="font-medium text-gray-700 hover:text-gray-900"
								>
									Login
								</Link>
							</NavigationMenuLink>
						</NavigationMenuItem>
						<NavigationMenuItem>
							<NavigationMenuLink asChild>
								<Link
									to="/register"
									className="font-medium text-gray-700 hover:text-gray-900"
								>
									Register
								</Link>
							</NavigationMenuLink>
						</NavigationMenuItem>
					</>
				)}
				{authUser && (
					<NavigationMenuItem>
						<Button variant="ghost" onClick={handleLogout}>
							Logout
						</Button>
					</NavigationMenuItem>
				)}
			</NavigationMenuList>
		</NavigationMenu>
	);
}
