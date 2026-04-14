"use client";

import { Home, Users, TrendingUp, Settings, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { LAUNCH_FEATURES } from "@/constants/features";

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
    enabled: LAUNCH_FEATURES.earn,
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
  const visibleTabs = tabs.filter((tab) => tab.enabled !== false);

  const getIsActive = (href: string) => {
    if (href === "/home") return pathname === "/home" || pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="max-w-2xl mx-auto px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="panel-sheen flex items-center justify-around rounded-[1.75rem] border border-spiceup-border px-2 pt-2 pb-1.5 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.35)]">
        {visibleTabs.map((tab) => {
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
                      : "text-spiceup-text-muted group-hover:text-spiceup-text-primary"
                  }`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </motion.div>
              <span
                className={`text-[10px] font-medium transition-colors duration-200 leading-none ${
                  isActive
                  ? "text-spiceup-accent"
                  : "text-spiceup-text-muted group-hover:text-spiceup-text-primary"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
        </div>
      </div>
    </nav>
  );
}
