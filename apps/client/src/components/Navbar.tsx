"use client";

import { NAVBAR_HEIGHT } from '@/lib/constants';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from "next/image";
import { Button } from './ui/button';
import { useGetAuthUserQuery, useGetNotificationsQuery } from '@/state/api';
import { signOut } from 'aws-amplify/auth';
import { Bell, MessageCircle, Plus, Search } from "lucide-react";
import { DropdownMenuContent, DropdownMenu, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { SidebarTrigger } from './ui/sidebar';
import PopupWidget from './widgets/PopupWidget';
import { useState, useEffect } from 'react';
import Chat from './widgets/Chat';
import Notify from './widgets/Notify';
import { getNotifySocket, disconnectNotifySocket } from '@/lib/socket';
import { Notification } from '@shared/types';
import { api } from '@/state/api';
import { useDispatch } from 'react-redux';

const Navbar = () => {
    const { data: authUser } = useGetAuthUserQuery();
    const router = useRouter();
    const pathname = usePathname();
    const dispatch = useDispatch();
    const [openChat, setOpenChat] = useState(false);
    const [openNotify, setOpenNotify] = useState(false);

    const isDashboardPage = pathname.includes("/managers") || pathname.includes("/tenants");

    const cognitoId = authUser?.cognitoInfo?.userId;

    // Lấy danh sách thông báo từ server
    const { data: notifications = [] } = useGetNotificationsQuery(
        cognitoId ?? "",
        { skip: !cognitoId }
    );

    const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;

    // Kết nối WebSocket /notify — lắng nghe thông báo mới thời gian thực
    useEffect(() => {
        if (!cognitoId) return;

        const socket = getNotifySocket(cognitoId);

        socket.on("newNotification", () => {
            // Invalidate cache để RTK Query tự fetch lại danh sách thông báo
            dispatch(api.util.invalidateTags(["Notifications"]));
        });

        return () => {
            socket.off("newNotification");
            disconnectNotifySocket();
        };
    }, [cognitoId, dispatch]);

    const handleSignOut = async () => {
        await signOut();
        window.location.href = "/";
    }

  return (
    <div 
    className="fixed top-0 left-0 w-full z-50 shadow-xl"
    style={{ height: `${NAVBAR_HEIGHT}px`}}
    >
        <div className="flex justify-between items-center w-full py-3 px-8 bg-primary-700 text-white">
            <div className="flex items-center gap-4 md:gap-6">
                {isDashboardPage && (
                    <div className="md:hidden">
                        <SidebarTrigger />
                    </div>
                )}
                <Link 
                href="/"
                className="cursor-pointer hover:text-primary-300!"
                scroll={false}>
                    <div className="flex items-center gap-3">
                        <Image 
                            src="/logo.svg"
                            alt="Rentiful logo"
                            width={24}
                            height={24}
                            className="w-6 h-6"
                        />
                        <div className="text-xl font-bold">
                            RENT
                            <span className="text-secondary-500 font-light hover:!text-primary-300!">
                                IFUL
                            </span>
                        </div>
                    </div>
                </Link>
                {isDashboardPage && authUser && (
                    <Button
                        variant="secondary"
                        className="md:ml-4 bg-primary-50 text-primary-700 hover:bg-secondary-500 hover:text-primary-50"
                        onClick={() => (
                            router.push(
                                authUser.userRole?.toLowerCase() === "manager"
                                    ? "/managers/properties/new"
                                    : "/search"
                            )
                        )}>
                            {authUser.userRole?.toLowerCase() === "manager" ? (
                                <>
                                    <Plus className="h-4 w-4" />
                                    <span className="hidden md:block ml-2">
                                        Thêm bất động sản mới
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Search className="h-4 w-4" />
                                    <span className="hidden md:block ml-2">
                                        Tìm kiếm bất động sản
                                    </span>
                                </>
                            )}
                        </Button>
                )}
            </div>
            {!isDashboardPage && (
                <p className="text-primary-200 hidden md:block">
                    Khám phá căn hộ cho thuê lý tưởng với công cụ tìm kiếm tiên tiến
                </p>
            )}
            <div className="flex items-center gap-5">
                {authUser ? (
                    <>
                        <div className="relative hidden md:block">
                            <MessageCircle 
                                className="w-6 h-6 cursor-pointer text-primary-200 hover:text-primary-400"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenChat((prev) => !prev);
                                }}
                            />
                            <span className="absolute top-0 right-0 w-2 h-2 bg-secondary-700 rounded-full pointer-events-none"></span>
                            <PopupWidget 
                                open={openChat} 
                                title="Tin nhắn"
                                onClose={() => setOpenChat(false)} 
                            >
                                <Chat />
                            </PopupWidget>
                        </div>
                        <div className="relative hidden md:block">
                            <Bell 
                                className="w-6 h-6 cursor-pointer text-primary-200 hover:text-primary-400" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenNotify((prev) => !prev);
                                }}/>
                            {/* Badge hiển thị số thông báo chưa đọc */}
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center pointer-events-none">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                            <PopupWidget
                                open={openNotify}
                                title="Thông báo"
                                onClose={() => setOpenNotify(false)}
                            >
                                <Notify
                                    notifications={notifications}
                                    userId={cognitoId ?? ""}
                                />
                            </PopupWidget>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger className="flex items-center gap-2 focus:outline-none">
                                <Avatar>
                                    <AvatarImage src={authUser.userInfo?.image} />
                                    <AvatarFallback className="bg-primary-600">
                                        {authUser.userRole?.[0].toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <p className="text-primary-200 hidden md:block">
                                    {authUser.userInfo?.name || authUser.cognitoInfo?.username}
                                </p>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-white text-primary-700">
                                <DropdownMenuItem 
                                    className="cursor-pointer hover:!bg-primary-700 hover:!text-primary-100 font-bold"
                                    onClick={() => router.push(
                                        authUser.userRole?.toLowerCase() === "manager"
                                        ? "/managers/properties"
                                        : "/tenants/favorites",
                                        { scroll: false }
                                    )}>
                                    Trang quản lý
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-primary-200 " />
                                    <DropdownMenuItem 
                                        className="cursor-pointer hover:!bg-primary-700 hover:!text-primary-100"
                                        onClick={() => router.push(
                                            `/${authUser.userRole?.toLowerCase()}s/settings`,
                                            { scroll: false }
                                        )}>
                                            Cài đặt
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                        className="cursor-pointer hover:!bg-primary-700 hover:!text-primary-100"
                                        onClick={handleSignOut}>
                                        Đăng xuất
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                ) : (
                    <>
                        <Link href="/signin">
                            <Button
                                variant="outline"
                                className="text-white border-white bg-transparent hover:bg-white hover:text-primary-700 rounded-lg"
                            >
                                Đăng nhập
                            </Button>
                        </Link>
                        <Link href="/signup">
                            <Button
                                variant="outline"
                                className="bg-secondary-600 hover:bg-white hover:text-primary-700 rounded-lg"
                            >
                                Đăng ký
                            </Button>
                        </Link>
                    </>
                )}
            </div>
        </div>
    </div>
  )
}

export default Navbar;