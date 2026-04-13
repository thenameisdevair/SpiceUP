"use client";

import { Home, Users, TrendingUp, Settings, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

const tabs = [
  {
    label: "Home",
    icon: Home,
    href: "/home",
  },
  {
    label: "Send",
    icon: ArrowUpRight,
    href: "/send",
  },
  {
    label: "Receive",
    icon: ArrowDownLeft,
    href: "/receive",
  },
  {
    label: "Earn",
    icon: TrendingUp,
    href: "/earn",
  },
  {
    label: "Groups",
    icon: Users,
    href: "/groups",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

export function TabBar() {
  const pathname = usePathname();

  const getIsActive = (href: string) => {
    if (href === "/home") return pathname === "/home" || pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-spiceup-surface/95 backdrop-blur-xl border-t border-spiceup-border safe-area-bottom">
      <div className="max-w-2xl mx-auto flex items-center justify-around px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const isActive = getIsActive(tab.href);
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className="relative flex flex-col items-center gap-1 py-1.5 px-3 min-w-[52px] group"
            >
              {/* Active indicator background */}
              {isActive && (
                <motion.div
                  layoutId="tabIndicator"
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-spiceup-accent rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <motion.div
                whileTap={{ scale: 0.85 }}
                className="relative"
              >
                <tab.icon
                  size={20}
                  className={`transition-colors duration-200 ${
                    isActive
                      ? "text-spiceup-accent"
                      : "text-spiceup-text-muted group-hover:text-spiceup-text-secondary"
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </motion.div>
              <span
                className={`text-[10px] font-medium transition-colors duration-200 leading-none ${
                  isActive
                    ? "text-spiceup-accent"
                    : "text-spiceup-text-muted group-hover:text-spiceup-text-secondary"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
