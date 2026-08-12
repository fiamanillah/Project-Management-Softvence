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
} from 'lucide-react';

export const data = {
  user: {
    name: 'Admin User',
    email: 'admin@softvence.com',
    avatar: 'https://github.com/shadcn.png',
  },
  teams: [
    {
      name: 'Softvence PM',
      plan: 'Enterprise',
    },
  ],
  navMain: [
    {
      title: 'Overview',
      url: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Projects',
      url: '/dashboard/projects',
      icon: Briefcase,
      items: [
        { title: 'All Projects', url: '/dashboard/projects' },
        { title: 'Components', url: '/dashboard/projects?tab=components' },
        { title: 'Assignments', url: '/dashboard/projects?tab=assignments' },
      ],
    },
    {
      title: 'Teams & Members',
      url: '/dashboard/teams',
      icon: Users,
    },
    {
      title: 'Clients & Profiles',
      url: '/dashboard/clients',
      icon: Building2,
    },
    {
      title: 'Issues & Support',
      url: '/dashboard/issues',
      icon: AlertCircle,
      badge: 5,
    },
    {
      title: 'Messages',
      url: '/dashboard/messages',
      icon: MessageSquare,
      badge: 3,
    },
    {
      title: 'Users & Roles',
      url: '/dashboard/users',
      icon: Shield,
    },
    {
      title: 'Settings',
      url: '/dashboard/settings',
      icon: Settings,
    },
  ],
  navSecondary: [
    {
      title: 'Support',
      url: '#',
      icon: HelpCircle,
    },
    {
      title: 'Feedback',
      url: '#',
      icon: Send,
    },
  ],
};
