"use client";

import Card from '@/components/Card';
import Header from '@/components/Header';
import Loading from '@/components/Loading';
import { useGetAuthUserQuery, useGetCurrentResidencesQuery, useGetTenantQuery } from '@/state/api'
import { FileText } from 'lucide-react';
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
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500 shadow-sm">
                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="font-medium text-base">Chưa có dự án đang thuê</p>
                <p className="text-sm text-gray-400 mt-1">
                    Vui lòng tham khảo thêm.
                </p>
          </div>
        )}
    </div>
  )
}

export default Residences