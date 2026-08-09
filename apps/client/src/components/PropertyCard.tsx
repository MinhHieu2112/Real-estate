import { Bath, Bed, Heart, House, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";

const PropertyCard = ({
  property,
  isFavorite,
  onFavoriteToggle,
  showFavoriteButton = true,
  propertyLink,
}: CardProps) => {
  const [imgSrc, setImgSrc] = useState(
    property.photoUrls?.[0] || "/placeholder.jpg"
  );

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-lg w-full mb-5">
      {/* Image */}
      <div className="relative w-full h-48">
        <Image
          src={imgSrc}
          alt={property.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={() => setImgSrc("/placeholder.jpg")}
          unoptimized={imgSrc.includes("example.com")}
        />
        {/* Badges */}
        <div className="absolute bottom-2 left-2 flex gap-1 flex-col">
          {property.isPetsAllowed && (
            <span className="bg-white/80 text-black text-xs font-semibold px-2 py-1 rounded-full w-fit">
              Thú cưng
            </span>
          )}
          {property.isParkingIncluded && (
            <span className="bg-white/80 text-black text-xs font-semibold px-2 py-1 rounded-full w-fit">
              Đỗ xe
            </span>
          )}
        </div>
        {/* Favorite Button */}
        {showFavoriteButton && (
          <button
            className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow"
            onClick={onFavoriteToggle}
          >
            <Heart
              className={`w-4 h-4 ${
                isFavorite ? "text-red-500 fill-red-500" : "text-gray-600"
              }`}
            />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <h2 className="text-lg font-bold">
            {propertyLink ? (
              <Link
                href={propertyLink}
                className="hover:underline hover:text-blue-600"
                scroll={false}
              >
                {property.name}
              </Link>
            ) : (
              property.name
            )}
          </h2>
          <p className="text-base font-bold whitespace-nowrap text-primary-700">
            {property.pricePerMonth?.toLocaleString("vi-VN")} VNĐ
            <span className="text-gray-500 text-xs font-normal"> tháng</span>
          </p>
        </div>

        <p className="text-gray-500 text-sm">
          {property?.location?.address}, {property?.location?.city}
        </p>

        <div className="flex items-center gap-1 text-sm">
          <Star className="w-3 h-3 text-yellow-400" />
          <span className="font-semibold">
            {property.averageRating?.toFixed(1) ?? "Chưa có"}
          </span>
          <span className="text-gray-500">({property.numberOfReviews ?? 0})</span>
        </div>

        <div className="flex gap-3 text-gray-600 text-sm mt-1">
          <span className="flex items-center gap-1">
            <Bed className="w-4 h-4" />
            {property.beds} phòng ngủ
          </span>
          <span className="flex items-center gap-1">
            <Bath className="w-4 h-4" />
            {property.baths} phòng tắm
          </span>
          <span className="flex items-center gap-1">
            <House className="w-4 h-4" />
            {property.squareFeet} sqft
          </span>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
