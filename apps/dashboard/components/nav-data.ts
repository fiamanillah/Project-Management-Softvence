import {
  LayoutDashboard,
  Users,
  Network,
  GitBranch,
  Building2,
  UsersRound,
  ShieldCheck,
  FolderKanban,
  MessagesSquare,
  FileSpreadsheet,
  KeyRound,
  Award,
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

export interface NavGroupConfig {
  label?: string;
  items: NavItemConfig[];
}

export const data = {
  user: {
    name: "Admin User",
    email: "admin@betopia.com",
    avatar: "https://github.com/shadcn.png",
  },
  teams: [
    {
      name: "Betopia Group",
      plan: "Enterprise",
    },
  ],
  navGroups: [
    {
      label: "Main",
      items: [
        {
          title: "Overview",
          url: "/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      label: "Organization",
      items: [
        {
          title: "Structure",
          url: "/dashboard/organization",
          icon: Network,
          permission: "auth.user.view",
        },
        {
          title: "Branches",
          url: "/dashboard/branches",
          icon: GitBranch,
          permission: "auth.user.view",
        },
        {
          title: "Departments",
          url: "/dashboard/departments",
          icon: Building2,
          permission: "organization.department.view",
        },
        {
          title: "Teams",
          url: "/dashboard/teams",
          icon: UsersRound,
          permission: "organization.team.view",
        },
      ],
    },
    {
      label: "Projects & Workspace",
      items: [
        {
          title: "Projects",
          url: "/dashboard/projects",
          icon: FolderKanban,
          permission: "project.view",
        },
        {
          title: "Manage Projects",
          url: "/dashboard/manage-projects",
          icon: MessagesSquare,
          permission: "project.view",
        },
      ],
    },
    {
      label: "Identity & Access",
      items: [
        {
          title: "Users Management",
          url: "/dashboard/users",
          icon: Users,
          permission: "auth.user.view",
        },
        {
          title: "Designations",
          url: "/dashboard/designations",
          icon: Award,
          permission: "auth.user.view",
        },
        {
          title: "Roles & Permissions",
          url: "/dashboard/roles",
          icon: ShieldCheck,
          permission: "auth.user.view",
        },
        {
          title: "Overrides & Delegations",
          url: "/dashboard/overrides",
          icon: KeyRound,
          permission: "auth.user.manage",
        },
      ],
    },
    {
      label: "Governance & Security",
      items: [
        {
          title: "Security Audit Logs",
          url: "/dashboard/audit-logs",
          icon: FileSpreadsheet,
          permission: "auth.user.manage",
        },
      ],
    },
  ] as NavGroupConfig[],
  navMain: [
    {
      title: "Overview",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Organization Structure",
      url: "/dashboard/organization",
      icon: Network,
      permission: "auth.user.view",
    },
    {
      title: "Branches",
      url: "/dashboard/branches",
      icon: GitBranch,
      permission: "auth.user.view",
    },
    {
      title: "Departments",
      url: "/dashboard/departments",
      icon: Building2,
      permission: "organization.department.view",
    },
    {
      title: "Teams",
      url: "/dashboard/teams",
      icon: UsersRound,
      permission: "organization.team.view",
    },
    {
      title: "Projects",
      url: "/dashboard/projects",
      icon: FolderKanban,
      permission: "project.view",
    },
    {
      title: "Manage Projects",
      url: "/dashboard/manage-projects",
      icon: MessagesSquare,
      permission: "project.view",
    },
    {
      title: "Users Management",
      url: "/dashboard/users",
      icon: Users,
      permission: "auth.user.view",
    },
    {
      title: "Designations",
      url: "/dashboard/designations",
      icon: Award,
      permission: "auth.user.view",
    },
    {
      title: "Roles & Permissions",
      url: "/dashboard/roles",
      icon: ShieldCheck,
      permission: "auth.user.view",
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
