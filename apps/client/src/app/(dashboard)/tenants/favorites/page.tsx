"use client";

import Card from '@/components/Card';
import Header from '@/components/Header';
import Loading from '@/components/Loading';
import { useGetAuthUserQuery, useGetPropertiesQuery, useGetTenantQuery } from '@/state/api';
import { FileText } from 'lucide-react';
import Image from 'next/image';
import React from 'react'

const Favorites = () => {
  const { data: authUser } = useGetAuthUserQuery();
  const { data: tenant } = useGetTenantQuery(
    authUser?.cognitoInfo?.userId || "",
    {
        skip: !authUser?.cognitoInfo?.userId,
    }
  );

  const { 
    data: favoriteProperties,
    isLoading,
    error,
  } = useGetPropertiesQuery(
    { favorites: tenant?.favorites?.map((fav: { id: number }) => fav.id) },
    { skip: !tenant?.favorites || tenant?.favorites.length === 0 }
  );

  if (isLoading) return <Loading />
  if (error) return <div>Lỗi khi tải danh sách yêu thích</div>

  return (
    <div className="dashboard-container">
      <Header
        title="Dự án yêu thích"
        subtitle="Xem và quản lý các dự án yêu thích của bạn"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {favoriteProperties?.map((property) => (
          <Card 
            key={property.id}
            property={property}
            isFavorite={true} 
            onFavoriteToggle={() => {}} 
            showFavoriteButton={false} 
            propertyLink={`/tenants/residences/${property.id}`}/>
        ))}
      </div>
        {(!favoriteProperties || favoriteProperties.length === 0) && (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500 shadow-sm">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="font-medium text-base">Bạn chưa có dự án yêu thích nào.</p>
            <p className="text-sm text-gray-400 mt-1">
              Mọi dự án bạn thích sẽ hiển thị tại đây.
            </p>
          </div>
        )}
    </div>
  );
};

export default Favorites;