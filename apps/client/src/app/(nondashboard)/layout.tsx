"use client";

import Navbar from "@/components/Navbar";
import { NAVBAR_HEIGHT } from "@/lib/constants";
import { useGetAuthUserQuery } from "@/state/api";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import React from "react"

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { data: authUser, isLoading: authLoading } = useGetAuthUserQuery();
  const router = useRouter();
  const pathname = usePathname();

  const userRole = authUser?.userRole?.toLowerCase();

  const shouldRedirect =
    userRole === "manager" &&
    (pathname === "/" || pathname.startsWith("/search"));

  useEffect(() => {
    if (!authUser?.userRole) return;

    if (shouldRedirect) {
      router.replace("/managers/properties");
    }
  }, [authUser, shouldRedirect, router]);

  if (authLoading) return <>Loading...</>;
  
  return (
    <div className="h-full w-full">
        <Navbar />
        <main className={`h-full flex w-full flex-col`}
        style={{ paddingTop: `${NAVBAR_HEIGHT}px`}}>
            {children}
        </main>
    </div>
  )
}

export default Layout;