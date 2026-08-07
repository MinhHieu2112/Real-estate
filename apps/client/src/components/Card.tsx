"use client";

import { cn } from '@/lib/utils';
import { Bath, Bed, Heart, MapPin, Maximize2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';

const Card = ({
    property,
    isFavorite,
    onFavoriteToggle,
    showFavoriteButton = true,
    propertyLink,
}: CardProps) => {
  const [imgSrc, setImgSrc] = useState(
    property.photoUrls?.[0] || "/placeholder.jpg"
  );
  const [isHovered, setIsHovered] = useState(false);

  const content = (
    <div
      className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 w-full cursor-pointer"
      style={{ transform: isHovered ? 'translateY(-4px)' : 'translateY(0)', transition: 'all 0.3s ease' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Section */}
      <div className="relative w-full h-52 overflow-hidden">
        <Image
          src={imgSrc}
          alt={property.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 30vw"
          onError={() => setImgSrc("/placeholder.jpg")}
        />

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Top-right: Favorite button */}
        {showFavoriteButton && (
          <button
            className="absolute top-3 right-3 bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/40 rounded-full p-2 transition-all duration-200 z-10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFavoriteToggle?.();
            }}
          >
            <Heart
              className={`w-4 h-4 transition-colors duration-200 ${
                isFavorite ? "text-rose-400 fill-rose-400" : "text-white"
              }`}
            />
          </button>
        )}

        {/* Bottom-right: price overlay */}
        <div className="absolute bottom-3 right-3 z-10">
          <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-xl px-3 py-1.5">
            <span className="text-white font-bold text-sm">
              {property.pricePerMonth?.toLocaleString("vi-VN")} VNĐ
            </span>
            <span className="text-white/80 text-[10px] ml-0.5">/tháng</span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Location */}
        {property.location && (
          <div className="flex items-center gap-1 mb-1.5">
            <MapPin className="w-3 h-3 text-blue-500 flex-shrink-0" />
            <p className="text-xs text-gray-500 truncate">
              {property.location.city}{property.location.state ? `, ${property.location.state}` : ''}
            </p>
          </div>
        )}

        {/* Name */}
        <h2 className="text-base font-bold text-gray-900 mb-3 truncate group-hover:text-blue-600 transition-colors duration-200">
          {property.name}
        </h2>

        {/* Stats row */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3 text-gray-500">
            <span className="flex items-center gap-1 text-xs font-medium">
              <Bed className="w-3.5 h-3.5 text-gray-400" />
              {property.beds}
            </span>
            <span className="w-px h-3 bg-gray-200" />
            <span className="flex items-center gap-1 text-xs font-medium">
              <Bath className="w-3.5 h-3.5 text-gray-400" />
              {property.baths}
            </span>
            <span className="w-px h-3 bg-gray-200" />
            <span className="flex items-center gap-1 text-xs font-medium">
              <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
              {property.squareFeet.toLocaleString()} m²
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                {
                  "bg-emerald-400": property.status === "Available",
                  "bg-yellow-400": property.status === "Rented",
                  "bg-gray-400": property.status === "Maintenance",
                }
              )}
            />

            <span
              className={cn(
                "text-[10px] font-medium",
                {
                  "text-emerald-600": property.status === "Available",
                  "text-yellow-600": property.status === "Rented",
                  "text-gray-600": property.status === "Maintenance",
                }
              )}
            >
              {property.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (propertyLink) {
    return (
      <Link href={propertyLink} scroll={false} className="block">
        {content}
      </Link>
    );
  }

  return content;
};

export default Card;