"use client";

import ApplicationCard from '@/components/ApplicationCard';
import Header from '@/components/Header';
import Loading from '@/components/Loading';
import { useGetApplicationsQuery, useGetAuthUserQuery } from '@/state/api';
import { CircleCheckBig, Clock, FileText, Signature, XCircle } from 'lucide-react';
import Image from 'next/image';
import React from 'react'
import { toast } from 'sonner';

const Applications = () => {
  const { data: authUser } = useGetAuthUserQuery();
  const {
    data: applications,
    isLoading,
    isError,
  } = useGetApplicationsQuery({
    userId: authUser?.cognitoInfo?.userId || "",
    userType: "tenant",
  });

  if (isLoading) return <Loading />
  if (isError || !applications) {
    toast.error("Không tìm thấy đơn đăng ký.")
  }

  return (
    <div className="dashboard-container">
        <Header 
            title="Đơn đăng ký"
            subtitle="Theo dõi và quản lý các đơn đăng ký thuê dự án của bạn"
        />
        <div className="w-full">
            {applications?.map((application) => (
                <ApplicationCard
                    key={application.id}
                    application={application}
                    userType="renter"
                >
                    <div className="flex justify-between gap-5 w-full pb-4 px-4">
                        {application.status === "Approved" ? (
                            <div className="bg-green-100 p-4 text-green-700 grow flex items-center">
                                <CircleCheckBig className="w-5 h-5 mr-2" />
                                Đơn đăng ký của bạn đã được duyệt {" "}
                            </div>
                        ) : application.status === "Pending" ? (
                            <div className="bg-yellow-100 p-4 text-yellow-700 grow flex items-center">
                                <Clock className="w-5 h-5 mr-2" />
                                Đơn đăng ký của bạn đang chờ phê duyệt
                            </div>
                        ) : (
                            <div className="bg-red-100 p-4 text-red-700 grow flex items-center">
                                <XCircle className="w-5 h-5 mr-2" />
                                Đơn đăng ký của bạn đã bị từ chối
                            </div>
                        )}
                    </div>
                </ApplicationCard>
            ))}
            {applications?.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500 shadow-sm">
                    <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="font-medium text-base">Bạn chưa có đơn đăng ký nào.</p>
                    <p className="text-sm text-gray-400 mt-1">
                        Mọi đơn đăng ký sẽ hiển thị tại đây.
                    </p>
                </div>
                )}
        </div>
    </div>
  )
}

export default Applications