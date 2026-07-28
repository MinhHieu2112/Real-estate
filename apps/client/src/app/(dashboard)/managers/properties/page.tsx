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
  if (error) return <div>Error loading properties</div>

  return (
    <div className="dashboard-container">
        <div className="flex justify-between items-center mb-6">
            <Header 
                title="My Properties"
                subtitle="View and manage your properties"
            />
            {/* <Link
                href="/managers/properties/new"
                className="bg-primary-700 hover:bg-primary-800 text-white font-semibold py-2.5 px-5 rounded-lg flex items-center shadow transition-all"
            >
                <Plus className="w-4 h-4 mr-2" />
                <span>Add Property</span>
            </Link> */}
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
                    alt="No properties"
                    width={600}
                    height={600}
                />
                <p className="text-gray-500 text-xl mt-8">
                    You don&apos;t have any properties yet
                </p>
            </div>
        )}
    </div>
  )
}

export default Properties