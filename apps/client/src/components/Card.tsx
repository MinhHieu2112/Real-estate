import { Bath, Bed, Heart, House } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react'

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

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-lg w-full mb-5">
        <div className="relative">
            <div className="w-full h-48 relative">
                <Image 
                src={imgSrc}
                alt={property.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 30vw"
                onError={() => setImgSrc("/placeholder.jpg")}
            />
            </div>
            <div className="absolute bottom-4 left-4 flex gap-2">
                {property.isPetsAllowed && (
                    <span className="bg-white/80 text-black text-xs font-semibold px-2 py-1 rounded-full">
                        Pets Allowed
                    </span>
                )}
                {property.isParkingIncluded && (
                    <span className="bg-white/80 text-black text-xs font-semibold px-2 py-1 rounded-full">
                        Parking Included
                    </span>
                )}
            </div>
            {showFavoriteButton && (
                <button
                    className="absolute bottom-4 right-4 bg-white hover:bg-white/90 rounded-full p-2 cursor-pointer"
                    onClick={onFavoriteToggle}
                >
                    <Heart 
                        className={`w-5 h-5 ${
                            isFavorite ? "text-red-500 fill-red-500" : "text-gray-600"
                        }`}
                    />
                </button>
            )}
        </div>
        <div className="p-4">
            <h2 className="text-xl font-bold mb-1">
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
            <p className="text-lg font-bold mb-3">
                ${property.pricePerMonth.toFixed(0)}{" "}
                <span className="text-gray-600 text-base font-normal"> /month</span>
            </p>
        </div>
        <hr />
        <div className="flex justify-between items-center gap-4 text-gray-600 mt-5">
            <span className="flex items-center">
                <Bed className="w-5 h-5 mr-2" />
                {property.beds} Bed
            </span>
            <span className="flex items-center">
                <Bath className="w-5 h-5 mr-2" />
                {property.baths} Bath
            </span>
            <span className="flex items-center">
                <House className="w-5 h-5 mr-2" />
                {property.squareFeet} sq ft
            </span>
        </div>
    </div>
  )
}

export default Card