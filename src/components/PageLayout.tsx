import type React from "react";

interface PageLayoutProps {
  children: React.ReactNode;
  centerContent?: boolean; // Option to center content within the block
  standalone?: boolean; // New prop: if true, removes default background/padding/shadow styles
}

export function PageLayout({
  children,
  centerContent = false,
  standalone = false,
}: PageLayoutProps) {
  const outerDivClasses = `flex justify-center min-h-screen bg-gray-100 ${!standalone ? "pt-20" : "items-center"}`;
  const innerDivClasses = `max-w-7xl mx-auto w-full ${!standalone ? "p-8 bg-white rounded-xl shadow-md" : ""} ${centerContent ? "flex flex-col items-center" : ""}`;

  return (
    <div className={outerDivClasses}>
      <div className={innerDivClasses}>{children}</div>
    </div>
  );
}
