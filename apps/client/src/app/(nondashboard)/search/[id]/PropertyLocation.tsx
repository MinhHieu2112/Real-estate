"use client";

import { useGetPropertyQuery } from "@/state/api";
import { Compass, MapPin } from "lucide-react";
import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";
const API_KEY = process.env.NEXT_PUBLIC_AWS_LOCATION_API_KEY || "";
const MAP_STYLE = "Standard";

// Ghép API Key trực tiếp vào URL style descriptor
const MAP_STYLE_URL = API_KEY
  ? `https://maps.geo.${AWS_REGION}.amazonaws.com/v2/styles/${MAP_STYLE}/descriptor?key=${API_KEY}`
  : "";

const PropertyLocation = ({ propertyId }: PropertyDetailsProps) => {
  const {
    data: property,
    isError,
    isLoading,
  } = useGetPropertyQuery(propertyId);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!MAP_STYLE_URL || !property || !mapContainerRef.current) return;

    const coordinates = property?.location?.coordinates;
    if (!coordinates?.longitude || !coordinates?.latitude) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE_URL,
      center: [coordinates.longitude, coordinates.latitude],
      zoom: 14,
    });

    new maplibregl.Marker()
      .setLngLat([coordinates.longitude, coordinates.latitude])
      .addTo(map);

    return () => {
      map.remove();
    };
  }, [property]);

  if (isLoading) return <>Loading...</>;
  if (isError || !property) {
    return <>Property not Found</>;
  }

  return (
    <div className="py-16">
      <h3 className="text-xl font-semibold text-primary-800 dark:text-primary-100">
        Map and Location
      </h3>
      <div className="flex justify-between items-center text-sm text-primary-500 mt-2">
        <div className="flex items-center text-gray-500">
          <MapPin className="w-4 h-4 mr-1 text-gray-700" />
          Property Address:
          <span className="ml-2 font-semibold text-gray-700">
            {property.location?.address || "Address not available"}
          </span>
        </div>
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(
            property.location?.address || ""
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex justify-between items-center hover:underline gap-2 text-primary-600"
        >
          <Compass className="w-5 h-5" />
          Get Directions
        </a>
      </div>
      <div
        className="relative mt-4 h-[300px] rounded-lg overflow-hidden"
        ref={mapContainerRef}
      />
    </div>
  );
};

export default PropertyLocation;