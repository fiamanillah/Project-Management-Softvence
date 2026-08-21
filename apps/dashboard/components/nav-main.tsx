'use client'

import React from 'react'
import { ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
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
import { PermissionGate } from '@/components/permission-gate/PermissionGate'
import { usePermissions, hasPermission } from '@/lib/permissions/PermissionContext'
import type { NavGroupConfig, NavItemConfig } from './nav-data'

export type NavItem = NavItemConfig
export type NavGroup = NavGroupConfig

function NavMainItem({ item }: { item: NavItemConfig }) {
  const pathname = usePathname()
  const isActive = pathname === item.url || (item.url !== '/dashboard' && pathname.startsWith(item.url))
  const isAnySubActive = Boolean(item.items?.some((subItem) => pathname === subItem.url))
  const shouldBeOpen = Boolean(item.isActive || isActive || isAnySubActive)
  const hasSubItems = Boolean(item.items?.length)

  const [isOpen, setIsOpen] = React.useState(shouldBeOpen)

  React.useEffect(() => {
    if (shouldBeOpen) {
      setIsOpen(true)
    }
  }, [shouldBeOpen])

  return (
    <PermissionGate code={item.permission}>
      <Collapsible
        key={item.title}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <SidebarMenuItem>
          {hasSubItems ? (
            <CollapsibleTrigger
              render={
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive}
                  className={cn(
                    'my-0.5 [&>svg]:size-4',
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
                'my-0.5 [&>svg]:size-4',
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
                    <PermissionGate key={subItem.title} code={subItem.permission}>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          isActive={isSubActive}
                          render={
                            <Link
                              href={subItem.url}
                              className={cn(
                                'flex items-center justify-between w-full h-8',
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
                    </PermissionGate>
                  )
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          ) : null}
        </SidebarMenuItem>
      </Collapsible>
    </PermissionGate>
  )
}

function NavGroupSection({ group }: { group: NavGroupConfig }) {
  const permissions = usePermissions()

  // Render the group section only if at least one item is accessible to the current user
  const visibleItems = group.items.filter(
    (item) => !item.permission || hasPermission(permissions, item.permission)
  )

  if (visibleItems.length === 0) {
    return null
  }

  return (
    <SidebarGroup className="py-1">
      {group.label && (
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-2 py-1 select-none">
          {group.label}
        </SidebarGroupLabel>
      )}
      <SidebarMenu>
        {group.items.map((item) => (
          <NavMainItem key={item.title} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

export function NavMain({
  groups,
  items,
}: {
  groups?: NavGroupConfig[]
  items?: NavItemConfig[]
}) {
  if (groups && groups.length > 0) {
    return (
      <div className="flex flex-col gap-1">
        {groups.map((group, idx) => (
          <NavGroupSection key={group.label || idx} group={group} />
        ))}
      </div>
    )
  }

  if (items && items.length > 0) {
    return (
      <SidebarGroup className="py-1">
        <SidebarMenu>
          {items.map((item) => (
            <NavMainItem key={item.title} item={item} />
          ))}
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  return null
}
