"use client";

import ApplicationCard from '@/components/ApplicationCard';
import Header from '@/components/Header';
import Loading from '@/components/Loading';
import { useGetApplicationsQuery, useGetAuthUserQuery } from '@/state/api';
import { CircleCheckBig, Clock, Download, XCircle } from 'lucide-react';
import Image from 'next/image';
import React from 'react'

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
  if (isError || !applications) return <div>Lỗi khi tải danh sách đơn đăng ký</div>;

  return (
    <div className="dashboard-container">
        <Header 
            title="Đơn đăng ký"
            subtitle="Theo dõi và quản lý các đơn đăng ký thuê bất động sản của bạn"
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

                    <button
                        className={`bg-white border border-gray-300 text-gray-700 py-2 px-4
                                    rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50`}
                    >
                        <Download className="w-5 h-5 mr-2"/>
                        Tải hợp đồng
                    </button>
                </div>
                </ApplicationCard>
            ))}
            {applications.length === 0 && (
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
    </div>
  )
}

export default Applications