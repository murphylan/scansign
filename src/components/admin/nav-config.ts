import {
  Home,
  LayoutGrid,
  User,
  LayoutDashboard,
  UserCheck,
  Vote,
  Gift,
  FileText,
  FolderKanban,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export const bottomNavItems: NavItem[] = [
  { name: "首页", href: "/", icon: Home },
  { name: "应用", href: "/apps", icon: LayoutGrid },
  { name: "我的", href: "/me", icon: User },
];

export const navigation: NavItem[] = [
  { name: "首页", href: "/dashboard", icon: LayoutDashboard },
  { name: "签到", href: "/checkins", icon: UserCheck },
  { name: "投票", href: "/votes", icon: Vote },
  { name: "表单", href: "/forms", icon: FileText },
  { name: "抽奖", href: "/lotteries", icon: Gift },
  { name: "项目", href: "/projects", icon: FolderKanban, disabled: true },
];

export const appTabs = [
  { key: "checkins", name: "签到", icon: UserCheck, color: "bg-emerald-500", createHref: "/checkins/new" },
  { key: "votes", name: "投票", icon: Vote, color: "bg-blue-500", createHref: "/votes/new" },
  { key: "forms", name: "表单", icon: FileText, color: "bg-purple-500", createHref: "/forms/new" },
  { key: "lotteries", name: "抽奖", icon: Gift, color: "bg-orange-500", createHref: "/lotteries/new" },
] as const;

export type AppTabKey = (typeof appTabs)[number]["key"];
