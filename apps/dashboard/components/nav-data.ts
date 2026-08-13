import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  AlertCircle,
  MessageSquare,
  Shield,
  Settings,
  HelpCircle,
  Send,
  Lock,
  FileSpreadsheet,
  KeyRound,
} from "lucide-react";

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
    },
    {
      title: "Departments",
      url: "/dashboard/departments",
      icon: Building2,
    },
    {
      title: "Designations & Matrix",
      url: "/dashboard/designations",
      icon: Lock,
    },
    {
      title: "Overrides & Delegations",
      url: "/dashboard/overrides",
      icon: KeyRound,
    },
    {
      title: "Security Audit Logs",
      url: "/dashboard/audit-logs",
      icon: FileSpreadsheet,
    },
  ],
};
