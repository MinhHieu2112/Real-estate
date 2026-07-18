"use client";

import Navbar from '@/components/Navbar'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { SidebarProvider } from '@/components/ui/sidebar'
import Sidebar from '@/components/AppSidebar'
import { NAVBAR_HEIGHT } from '@/lib/constants'
import { useGetAuthUserQuery } from '@/state/api'
import React from 'react'

const DashboardLayout = ({ children }: {children: React.ReactNode}) => {
    const { data: authUser, isLoading: authLoading } = useGetAuthUserQuery();
    const router = useRouter();
    const pathname = usePathname();
    const userRole = authUser?.userRole?.toLowerCase();

    const isAuthorized =
    !!userRole &&
    (
        (userRole === "manager" && pathname.startsWith("/managers")) ||
        (userRole === "tenant" && pathname.startsWith("/tenants"))
    );

    useEffect(() => {
    if (!authUser?.userRole) return;

    if (!isAuthorized) {
        router.replace(
        userRole === "manager"
            ? "/managers/properties"
            : "/tenants/favorites"
        );
      }
    }, [authUser, isAuthorized, pathname, router, userRole]);
    
    if (authLoading) return <>Loading...</>;
    if (!authUser?.userRole) return null;
    if (!isAuthorized) return <>Loading...</>;

    return (
        <SidebarProvider>
        <div className="min-h-screen w-full bg-primary-100">
            <Navbar />
            <div style={{ paddingTop: `${NAVBAR_HEIGHT}px`}}>
                <main className="flex">
                    <Sidebar userType={authUser.userRole}/>
                    <div className="flex-grow transition-all duration-300">
                        {children}
                    </div>
                </main>
            </div>
        </div>
        </SidebarProvider>
    )
}

export default DashboardLayout;