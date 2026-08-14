"use client";

import Card from '@/components/Card';
import Header from '@/components/Header';
import Loading from '@/components/Loading';
import { useGetAuthUserQuery, useGetManagerPropertiesQuery } from '@/state/api';
import React from 'react'
import Image from 'next/image';
import { FileText } from 'lucide-react';
const Properties = () => {
  const { data: authUser } = useGetAuthUserQuery();
  const { 
    data: managerProperties,
    isLoading,
    error,
  } = useGetManagerPropertiesQuery(authUser?.cognitoInfo?.userId || "", {
      skip: !authUser?.cognitoInfo?.userId,
  })

  if (isLoading) return <Loading />
  if (error) return <div>Lỗi khi tải danh sách dự án</div>

  return (
    <div className="dashboard-container">
        <div className="flex justify-between items-center mb-6">
            <Header 
                title="Dự án của tôi"
                subtitle="Xem và quản lý các dự án của bạn"
            />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {managerProperties?.map((property) => (
                <Card 
                    key={property.id}
                    property={property}
                    isFavorite={false}
                    onFavoriteToggle={() => {}}
                    showFavoriteButton={false}
                    propertyLink={`/managers/properties/${property.id}`} />
            ))}
        </div>
        {(!managerProperties || managerProperties.length === 0) && (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500 shadow-sm">
                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="font-medium text-base">Chưa có dự án nào</p>
                <p className="text-sm text-gray-400 mt-1">
                    Dự án được tạo sẽ hiển thị ngay tại đây.
                </p>
          </div>
        )}
    </div>
  )
}

export default Properties