"use client";

import ApplicationCard from '@/components/ApplicationCard';
import Header from '@/components/Header';
import Loading from '@/components/Loading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGetApplicationsQuery, useGetAuthUserQuery, useUpdateApplicationStatusMutation } from '@/state/api'
import { CircleCheckBig, Download, File, Hospital } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react'

const Applications = () => {
  const { data: authUser } = useGetAuthUserQuery();
  const [activeTab, setActiveTab] = useState("all");
  const {
    data: applications,
    isLoading,
    isError
  } = useGetApplicationsQuery(
    {
      userId: authUser?.cognitoInfo?.userId || "",
      userType: "manager",
    },
    {
      skip: !authUser?.cognitoInfo?.userId,
    }
  );
  const [updateApplicationStatus] = useUpdateApplicationStatusMutation();

  const handleStatusChange = async (id: number, status: string) => {
      await updateApplicationStatus({id, status});
  }

  if (isLoading) return <Loading />;
  if (isError || !applications) return <div>Lỗi khi tải danh sách đơn đăng ký</div>;

  const filteredApplications = applications?.filter((application) => {
    if (activeTab === "all") return true;
    return application.status.toLowerCase() === activeTab;
  });

  return (
    <div className="dashboard-container">
        <Header
            title="Đơn đăng ký"
            subtitle="Xem và quản lý các đơn đăng ký thuê dự án của bạn"
        />
        <Tabs 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full my-5"
        >
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">Tất cả</TabsTrigger>
                <TabsTrigger value="pending">Chờ duyệt</TabsTrigger>
                <TabsTrigger value="approved">Đã duyệt</TabsTrigger>
                <TabsTrigger value="denied">Đã từ chối</TabsTrigger>
            </TabsList>
            {["all", "pending", "approved", "denied"].map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-5 w-full">
                    {filteredApplications.filter(
                        (application) => 
                            tab === "all" || application.status.toLowerCase() === tab
                    )
                    .map((application) => (
                        <ApplicationCard
                            key={application.id}
                            application={application}
                            userType="manager"
                        >
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 w-full">
                                    {/* Colored Section Status */}
                                    <div
                                        className={`p-3.5 rounded-xl text-xs sm:text-sm grow w-full md:w-auto border ${
                                            application.status === "Approved"
                                            ? "bg-green-50 border-green-200 text-green-800"
                                            : application.status === "Denied"
                                            ? "bg-red-50 border-red-200 text-red-800"
                                            : "bg-amber-50 border-amber-200 text-amber-800"
                                        }`}
                                    >
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <File className="w-4 h-4 shrink-0" />
                                            <span>
                                            Đơn đăng ký nộp ngày{" "}
                                            <strong>
                                            {new Date(
                                                application.applicationDate
                                            ).toLocaleDateString('vi-VN')}
                                            </strong>
                                            .
                                            </span>
                                            <CircleCheckBig className="w-4 h-4 ml-1 shrink-0" />
                                            <span className="font-semibold">
                                            {application.status === "Approved" &&
                                                "Đơn đăng ký này đã được phê duyệt."}
                                            {application.status === "Denied" &&
                                                "Đơn đăng ký này đã bị từ chối."}
                                            {application.status === "Pending" &&
                                                "Đơn đăng ký này đang chờ xem xét."}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right Button */}
                                    <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                                        <Link
                                            href={`/managers/properties/${application.propertyId}`}
                                            className="bg-white border border-gray-200 text-gray-700 py-2 px-3.5 
                                                        rounded-lg text-xs font-semibold flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm"
                                            scroll={false}
                                        >
                                            <Hospital className="w-4 h-4 mr-1.5" />
                                            Chi tiết dự án
                                        </Link>
                                        {application.status === "Approved" && (
                                            <button
                                                className="bg-white border border-gray-200 text-gray-700 py-2 px-3.5
                                                            rounded-lg text-xs font-semibold flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm"
                                            >
                                                <Download className="w-4 h-4 mr-1.5" />
                                                Tải hợp đồng
                                            </button>
                                        )}
                                        {application.status === "Pending" && (
                                            <>
                                                <button
                                                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
                                                    onClick={() =>
                                                    handleStatusChange(application.id, "Approved")
                                                    }
                                                >
                                                    Phê duyệt
                                                </button>
                                                <button
                                                    className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-all shadow-sm"
                                                    onClick={() =>
                                                    handleStatusChange(application.id, "Denied")
                                                    }
                                                >
                                                    Từ chối
                                                </button>
                                            </>
                                        )}
                                        {application.status === "Denied" && (
                                            <button
                                            className="bg-gray-900 text-white py-2 px-3.5 rounded-lg text-xs font-semibold flex items-center
                                            justify-center hover:bg-gray-800 transition-all shadow-sm"
                                            >
                                                Liên hệ người dùng
                                            </button>
                                        )}
                                    </div>
                            </div>
                        </ApplicationCard>
                    ))}
                </TabsContent>
            ))}
        </Tabs>
        {(!filteredApplications || filteredApplications.length === 0) && (
            <div className="flex flex-col items-center">
                <Image
                    src="/not-found.png"
                    alt="Không tìm thấy"
                    width={500}
                    height={500}
                />
                <p className="text-gray-500 text-xl mt-8">
                    Bạn chưa có đơn đăng ký nào
                </p>
            </div>
        )}
    </div>
  )
}

export default Applications