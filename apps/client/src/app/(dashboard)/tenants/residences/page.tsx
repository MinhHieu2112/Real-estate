"use client";

import Card from '@/components/Card';
import Header from '@/components/Header';
import Loading from '@/components/Loading';
import { useGetAuthUserQuery, useGetCurrentResidencesQuery, useGetTenantQuery } from '@/state/api'
import Image from 'next/image';
import React from 'react'

const Residences = () => {
  const { data: authUser } = useGetAuthUserQuery();
  const { data: tenant } = useGetTenantQuery(
    authUser?.cognitoInfo?.userId || "",
    {
        skip: !authUser?.cognitoInfo?.userId,
    }
  );
  const {
    data: currentResidences,
    isLoading,
    error
  } = useGetCurrentResidencesQuery(authUser?.cognitoInfo?.userId || "", {
      skip: !authUser?.cognitoInfo?.userId,
  });

  if (isLoading) return <Loading />
  if (error) return <div>Lỗi khi tải danh sách nơi ở hiện tại</div>

  return (
    <div className="dashboard-container">
        <Header 
            title="Nơi ở hiện tại"
            subtitle="Xem và quản lý nơi ở hiện tại của bạn"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentResidences?.map((property) => (
                <Card
                    key={property.id}
                    property={property} 
                    isFavorite={tenant?.favorites?.some(favorite => favorite.id === property.id) || false}
                    onFavoriteToggle={() => {}}
                    showFavoriteButton={false}
                    propertyLink={`/tenants/residences/${property.id}`}
                />
            ))}
        </div>
        {(!currentResidences || currentResidences.length === 0) && (
            <div className="flex flex-col items-center">
                <Image
                    src="/not-found.png"
                    alt="Không tìm thấy"
                    width={500}
                    height={500}
                />
                <p className="text-gray-500">Không có nơi ở hiện tại nào</p>
            </div>
        )}
    </div>
  )
}

export default Residences