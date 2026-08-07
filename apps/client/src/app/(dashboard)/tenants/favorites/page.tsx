"use client";

import Card from '@/components/Card';
import Header from '@/components/Header';
import Loading from '@/components/Loading';
import { useGetAuthUserQuery, useGetPropertiesQuery, useGetTenantQuery } from '@/state/api';
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
  );
};

export default Favorites;