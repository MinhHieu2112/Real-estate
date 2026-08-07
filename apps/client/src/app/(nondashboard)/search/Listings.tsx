import PropertyCard from '@/components/PropertyCard';
import CardCompact from '@/components/CardCompact';
import { useAddFavoritePropertyMutation, useRemoveFavoritePropertyMutation, useGetAuthUserQuery, useGetPropertiesQuery, useGetTenantQuery } from '@/state/api';
import { useAppSelector } from '@/state/redux';
import { Property } from '@shared/types';
import React from 'react'

const Listings = () => {
  const { data: authUser } = useGetAuthUserQuery();
  const { data: tenant } = useGetTenantQuery(
    authUser?.cognitoInfo?.userId || "",
    {
        skip: !authUser?.cognitoInfo?.userId,
    }
  );
  const [addFavorite] = useAddFavoritePropertyMutation();
  const [removeFavorite] = useRemoveFavoritePropertyMutation();
  const viewMode = useAppSelector((state) => state.global.viewMode);
  const filters = useAppSelector((state) => state.global.filters);
  
  const {
    data: properties,
    isLoading,
    isError,
  } = useGetPropertiesQuery(filters);

  const handleFavoriteToggle = async (propertyId: number) => {
    if (!authUser) return;

    const isFavorite = tenant?.favorites?.some(
      (fav: Property) => fav.id === propertyId
    );

    if (isFavorite) {
      await removeFavorite({
        cognitoId: authUser.cognitoInfo.userId,
        propertyId,
      });
    } else {
      await addFavorite({
        cognitoId: authUser.cognitoInfo.userId,
        propertyId,
      });
    }
  };

  if (isLoading) return <>Đang tải...</>
  if (isError || !properties) return <div>Không thể tải danh sách dự án</div>

  return (
    <div className="w-full">
        <h3 className="text-sm px-4 font-bold">
            {properties.length}{" "}
            <span className="text-gray-700 font-normal">
                dự án tại {filters.location}
            </span>
        </h3>
        <div className="flex">
            <div className="p-4 w-full">
                {properties?.map((property) => 
                    viewMode === "grid" ? (
                        <PropertyCard 
                            key={property.id}
                            property={property} 
                            isFavorite={
                                tenant?.favorites?.some(
                                    (fav: Property) => fav.id === property.id
                                ) || false
                            }
                            onFavoriteToggle={() => handleFavoriteToggle(property.id)}
                            showFavoriteButton={!!authUser}
                            propertyLink={`/search/${property.id}`}
                        /> 
                        ) : (
                        <CardCompact 
                            key={property.id}
                            property={property} 
                            isFavorite={
                                tenant?.favorites?.some(
                                    (fav: Property) => fav.id === property.id
                                ) || false
                            }
                            onFavoriteToggle={() => handleFavoriteToggle(property.id)}
                            showFavoriteButton={!!authUser}
                            propertyLink={`/search/${property.id}`}
                        />
                        )
                    )}
            </div>
        </div>
    </div>
  )
}

export default Listings