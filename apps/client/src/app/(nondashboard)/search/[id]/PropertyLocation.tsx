"use client";

import { useGetPropertyQuery, useGetDirectionsQuery } from "@/state/api";
import { Compass, MapPin, Car, Footprints, Navigation } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@/components/ui/button";

const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";
const API_KEY = process.env.NEXT_PUBLIC_AWS_LOCATION_API_KEY || "";
const MAP_STYLE = "Standard";

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
  const [showDirections, setShowDirections] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [travelMode, setTravelMode] = useState<"Car" | "Pedestrian">("Car");
  const [geoError, setGeoError] = useState<string | null>(null);

  const destLat = property?.location?.coordinates?.latitude;
  const destLng = property?.location?.coordinates?.longitude;

  // Fetch directions using AWS Routes API via NestJS backend
  const { data: directions, isFetching: isCalculatingRoute } = useGetDirectionsQuery(
    {
      originLat: userLocation?.lat ?? 0,
      originLng: userLocation?.lng ?? 0,
      destinationLat: destLat ?? 0,
      destinationLng: destLng ?? 0,
      travelMode,
    },
    {
      skip: !showDirections || !userLocation || !destLat || !destLng,
    }
  );

  const handleGetLocationAndDirections = () => {
    setShowDirections(true);
    if (!navigator.geolocation) {
      setGeoError("Trình duyệt của bạn không hỗ trợ định vị địa lý");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGeoError(null);
      },
      () => {
        // Default fallback (HCM Center) if user denies geolocation
        setUserLocation({ lat: 10.7769, lng: 106.7009 });
        setGeoError("Đang sử dụng vị trí mặc định (Trung tâm TP.HCM). Hãy bật GPS để chỉ đường chính xác.");
      }
    );
  };

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

    new maplibregl.Marker({ color: "#2563eb" })
      .setLngLat([coordinates.longitude, coordinates.latitude])
      .addTo(map);

    return () => {
      map.remove();
    };
  }, [property]);

  if (isLoading) return <>Đang tải...</>;
  if (isError || !property) {
    return <>Không tìm thấy bất động sản</>;
  }

  const durationMin = directions?.duration
    ? Math.round(directions.duration / 60)
    : null;
  const distanceKm = directions?.distance
    ? (directions.distance / 1000).toFixed(1)
    : null;

  return (
    <div className="py-12">
      <h3 className="text-xl font-semibold text-primary-800 dark:text-primary-100">
        Bản đồ và vị trí
      </h3>
      <div className="flex justify-between items-center text-sm text-primary-500 mt-2">
        <div className="flex items-center text-gray-500">
          <MapPin className="w-4 h-4 mr-1 text-gray-700" />
          Địa chỉ bất động sản:
          <span className="ml-2 font-semibold text-gray-700">
            {property.location?.address || "Địa chỉ không khả dụng"}
          </span>
        </div>
        <Button
          onClick={handleGetLocationAndDirections}
          variant="outline"
          className="flex items-center gap-2 border-primary-500 text-primary-700 hover:bg-primary-50 rounded-xl"
        >
          <Navigation className="w-4 h-4 text-primary-600" />
          Xem chỉ đường
        </Button>
      </div>

      {/* Directions Panel Widget */}
      {showDirections && (
        <div className="mt-4 p-4 bg-primary-50 border border-primary-200 rounded-xl space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-primary-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-primary-700" />
              Chi tiết tuyến đường
            </h4>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={travelMode === "Car" ? "default" : "outline"}
                onClick={() => setTravelMode("Car")}
                className="gap-1 rounded-lg text-xs"
              >
                <Car className="w-3.5 h-3.5" /> Lái xe
              </Button>
              <Button
                size="sm"
                variant={travelMode === "Pedestrian" ? "default" : "outline"}
                onClick={() => setTravelMode("Pedestrian")}
                className="gap-1 rounded-lg text-xs"
              >
                <Footprints className="w-3.5 h-3.5" /> Đi bộ
              </Button>
            </div>
          </div>

          {geoError && <p className="text-xs text-amber-700">{geoError}</p>}

          {isCalculatingRoute ? (
            <p className="text-sm text-gray-600 animate-pulse">Đang tính toán tuyến đường tối ưu...</p>
          ) : directions && durationMin !== null ? (
            <div className="space-y-2 text-sm text-gray-800">
              <div className="flex gap-6 font-medium text-base">
                <span>⏱️ Thời gian dự kiến: <strong className="text-primary-700">{durationMin} phút</strong></span>
                <span>📏 Khoảng cách: <strong className="text-primary-700">{distanceKm} km</strong></span>
              </div>
              <p className="text-xs text-gray-500">
                Được hỗ trợ bởi AWS GeoRoutes v2 — Tính toán tuyến đường chính xác.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Đang lấy tọa độ để chỉ đường...</p>
          )}
        </div>
      )}

      <div
        className="relative mt-4 h-[350px] rounded-lg overflow-hidden border border-gray-200"
        ref={mapContainerRef}
      />
    </div>
  );
};

export default PropertyLocation;