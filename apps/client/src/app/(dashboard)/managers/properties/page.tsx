"use client";

import Card from '@/components/Card';
import Header from '@/components/Header';
import Loading from '@/components/Loading';
import { useGetAuthUserQuery, useGetManagerPropertiesQuery } from '@/state/api';
import React from 'react'
import Image from 'next/image';
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
            <div className="flex flex-col items-center">
                <Image
                    src="/not-found.png"
                    alt="Không có dự án"
                    width={600}
                    height={600}
                />
                <p className="text-gray-500 text-xl mt-8">
                    Bạn chưa có dự án nào
                </p>
            </div>
        )}
    </div>
  )
}

export default Properties