import {
  LayoutDashboard,
  Users,
  Building2,
  Lock,
  FileSpreadsheet,
  KeyRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItemConfig {
  title: string;
  url: string;
  icon: LucideIcon;
  permission?: string;
  isActive?: boolean;
  badge?: string | number;
  items?: {
    title: string;
    url: string;
    permission?: string;
    badge?: string | number;
  }[];
}

export const data = {
  user: {
    name: "Admin User",
    email: "admin@softvence.com",
    avatar: "https://github.com/shadcn.png",
  },
  teams: [
    {
      name: "Softvence PM",
      plan: "Enterprise",
    },
  ],
  navMain: [
    {
      title: "Overview",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Users Management",
      url: "/dashboard/users",
      icon: Users,
      permission: "auth.user.view",
    },
    {
      title: "Departments",
      url: "/dashboard/departments",
      icon: Building2,
      permission: "organization.department.view",
    },
    {
      title: "Designations & Matrix",
      url: "/dashboard/designations",
      icon: Lock,
      permission: "organization.designation.view",
    },
    {
      title: "Overrides & Delegations",
      url: "/dashboard/overrides",
      icon: KeyRound,
      permission: "auth.user.manage",
    },
    {
      title: "Security Audit Logs",
      url: "/dashboard/audit-logs",
      icon: FileSpreadsheet,
      permission: "auth.user.manage",
    },
  ] as NavItemConfig[],
};
