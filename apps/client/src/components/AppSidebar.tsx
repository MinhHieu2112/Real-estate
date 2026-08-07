import { NAVBAR_HEIGHT } from '@/lib/constants'
import Link  from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarHeader, SidebarMenu, SidebarMenuItem, useSidebar, Sidebar, SidebarContent, SidebarMenuButton } from './ui/sidebar'
import { Building, FileText, Settings, Heart, Home, Menu, X } from 'lucide-react'
import { cn } from "@/lib/utils";
import React from 'react'

const AppSidebar = ({ userType }: AppSidebarProps) => {
  const pathname = usePathname();
  const { toggleSidebar, open } = useSidebar();
  const navLinks =
    userType === "manager"
    ? [{ icon: Building, label: "Dự án của tôi", href: "/managers/properties" },
       { icon: FileText, label: "Đơn đăng ký thuê", href: "/managers/applications" },
       { icon: Settings, label: "Cài đặt tài khoản", href: "/managers/settings" }]
    : [{ icon: Heart, label: "Danh sách yêu thích", href: "/tenants/favorites" },
       { icon: FileText, label: "Đơn đã gửi", href: "/tenants/applications" },
       { icon: Home, label: "Nơi ở hiện tại", href: "/tenants/residences" },
       { icon: Settings, label: "Cài đặt tài khoản", href: "/tenants/settings" }]

  return (
    <Sidebar
      collapsible="icon"
      className="fixed left-0 bg-white shadow-lg"
      style={{
        top: `${NAVBAR_HEIGHT}px`,
        height: `calc(100vh - ${NAVBAR_HEIGHT}px)`
      }}>
        <SidebarHeader>
            <SidebarMenu>
                <SidebarMenuItem>
                    <div
                        className={cn(
                            "flex min-h-[56px] w-full items-center pt-3 mb-3",
                            open ? "justify-between px-6" : "justify-center"
                        )}
                        >
                            {open ? (
                                <>
                                    <h1 className="text-xl font-bold text-gray-800">
                                        {userType === "manager" ? "Trang quản lý": "Trang chủ"}
                                    </h1>
                                    <button
                                        className="hover:bg-gray-100 p-2 rounded-md"
                                        onClick={() => toggleSidebar()}
                                        >
                                            <X className="h-6 w-6 text-gray-400" />
                                    </button>
                                </>
                            ) : (
                                    <button
                                        className="hover:bg-gray-100 p-2 rounded-md"
                                        onClick={() => toggleSidebar()}
                                        >
                                            <Menu className="h-6 w-6 text-gray-400" />
                                    </button>
                                )
                            }
                    </div>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
            <SidebarMenu>
                {navLinks.map((link) => {
                    const isActive = pathname === link.href;

                    return (
                        <SidebarMenuItem key={link.href}>
                            <SidebarMenuButton
                                render={<Link href={link.href} className="w-full" scroll={false} />}
                                isActive={isActive}
                                className={cn(
                                    "flex items-center px-7 py-7",
                                    isActive
                                        ? "bg-gray-100"
                                        : "text-gray-600 hover:bg-gray-100"
                                )}
                                >
                                    <div className="flex items-center gap-3">
                                        <link.icon className={`h-5 w-5 ${
                                            isActive ? "text-blue-600": "text-gray-600"
                                        }`} />
                                        <span
                                            className={`font-medium ${
                                                isActive ? "text-blue-600": "text-gray-600"
                                            }`}>
                                                {link.label}
                                        </span>
                                    </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )
                })}
            </SidebarMenu>
        </SidebarContent>
      </Sidebar>
  )
}

export default AppSidebar