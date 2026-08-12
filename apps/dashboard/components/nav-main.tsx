'use client'

import React from 'react'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMenuBadge,
} from '@workspace/ui/components/sidebar'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@workspace/ui/lib/utils'
import { usePermission } from '@/lib/use-permission'

export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  isActive?: boolean
  badge?: string | number
  permission?: string
  items?: {
    title: string
    url: string
    badge?: string | number
  }[]
}

function NavMainItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const hasPermission = item.permission ? usePermission(item.permission) : true

  if (!hasPermission) {
    return null
  }

  const isActive = pathname === item.url || (item.url !== '/dashboard' && pathname.startsWith(item.url))
  const hasSubItems = Boolean(item.items?.length)

  return (
    <Collapsible
      key={item.title}
      defaultOpen={item.isActive || isActive}
    >
      <SidebarMenuItem>
        {hasSubItems ? (
          <CollapsibleTrigger
            render={
              <SidebarMenuButton
                tooltip={item.title}
                isActive={isActive}
                className={cn(
                  'my-1 [&>svg]:size-5',
                  isActive && 'text-primary font-medium'
                )}
              >
                <item.icon className={isActive ? 'text-primary' : ''} />
                <span>{item.title}</span>
                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            }
          />
        ) : (
          <SidebarMenuButton
            tooltip={item.title}
            isActive={isActive}
            className={cn(
              'my-1 [&>svg]:size-5',
              isActive && 'text-primary font-medium'
            )}
            render={
              <Link href={item.url} className="flex items-center gap-2 w-full">
                <item.icon className={isActive ? 'text-primary' : ''} />
                <span>{item.title}</span>
              </Link>
            }
          />
        )}
        {item.badge && (
          <SidebarMenuBadge className="bg-primary/10 text-primary border-primary/20">
            {item.badge}
          </SidebarMenuBadge>
        )}
        {hasSubItems ? (
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.items?.map((subItem) => {
                const isSubActive = pathname === subItem.url
                return (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton
                      isActive={isSubActive}
                      render={
                        <Link
                          href={subItem.url}
                          className={cn(
                            'flex items-center justify-between w-full h-9',
                            isSubActive ? 'text-primary font-medium' : ''
                          )}
                        >
                          <span>{subItem.title}</span>
                          {subItem.badge && (
                            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-md bg-primary/10 px-1 text-[10px] font-bold text-primary">
                              {subItem.badge}
                            </span>
                          )}
                        </Link>
                      }
                    />
                  </SidebarMenuSubItem>
                )
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        ) : null}
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <NavMainItem key={item.title} item={item} pathname={pathname} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
