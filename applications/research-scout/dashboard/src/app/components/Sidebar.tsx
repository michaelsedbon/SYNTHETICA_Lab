"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
    { href: "/", label: "Dashboard", icon: "📊" },
    { href: "/papers", label: "Papers", icon: "📄" },
    { href: "/people", label: "People", icon: "👤" },
    { href: "/topics", label: "Topics", icon: "🧬" },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="flex w-56 flex-col border-r border-white/[0.06] bg-[#0c0c0f]">
            {/* Logo */}
            <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-base ring-1 ring-white/[0.08]">
                    🔬
                </div>
                <div>
                    <h1 className="text-sm font-semibold tracking-tight">
                        Research Scout
                    </h1>
                    <p className="text-[10px] text-[var(--muted)]">Paris Community Lab</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
                {nav.map((item) => {
                    const active = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${active
                                    ? "bg-white/[0.06] text-white ring-1 ring-white/[0.06]"
                                    : "text-[var(--muted)] hover:bg-white/[0.04] hover:text-white"
                                }`}
                        >
                            <span className="text-base">{item.icon}</span>
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="border-t border-white/[0.06] px-5 py-4">
                <p className="text-[10px] text-[var(--muted)]">
                    Synthetic Biology · Robotics
                    <br />
                    Art/Design · AI · DIYBio
                </p>
            </div>
        </aside>
    );
}
