import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Fab Planner — Documentation",
    description: "Comprehensive documentation for Fab Planner manufacturing management tool",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
