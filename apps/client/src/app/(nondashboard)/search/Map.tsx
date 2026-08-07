"use client";

import { useGetPropertiesQuery } from "@/state/api";
import { useAppSelector } from "@/state/redux";
import { Property } from "@shared/types";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import React, { useEffect, useRef } from "react";

const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";
const MAP_NAME = process.env.NEXT_PUBLIC_AWS_LOCATION_MAP_NAME || "";
const API_KEY = process.env.NEXT_PUBLIC_AWS_LOCATION_API_KEY || "";
const MAP_STYLE = "Standard";

// Ghép API Key trực tiếp vào URL style descriptor
const MAP_STYLE_URL = API_KEY
  ? `https://maps.geo.${AWS_REGION}.amazonaws.com/v2/styles/${MAP_STYLE}/descriptor?key=${API_KEY}`
  : "";

const Map = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const filters = useAppSelector((state) => state.global.filters);

  const {
    data: properties,
    isLoading,
    isError,
  } = useGetPropertiesQuery(filters);

  useEffect(() => {
    if (!mapContainerRef.current || !MAP_STYLE_URL) return;
    
    // Tạo bản đồ mới
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE_URL,
      center: filters.coordinates
        ? [filters.coordinates[0], filters.coordinates[1]]
        : [106.6297, 10.8231],
      zoom: 11,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.resize();
    });

    return () => {
      // Dọn dẹp marker
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      // Hủy bản đồ
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Tự động di chuyển bản đồ
  useEffect(() => {
    if (!mapRef.current || !filters.coordinates) return;

    mapRef.current.flyTo({
      center: [filters.coordinates[0], filters.coordinates[1]],
      zoom: 12,
      essential: true,
    });
  }, [filters.coordinates]);

  // Cập nhật lại marker
  useEffect(() => {
    if (!mapRef.current || !properties) return;

    const map = mapRef.current;

    // Xóa đi marker cũ
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Tạo lại marker mới
    properties.forEach((property) => {
      const marker = createPropertyMarker(property, map)
      if (marker) {
        markersRef.current.push(marker);
      }
    });
  }, [properties]);

  if (!MAP_NAME || !API_KEY) {
    return (
      <div className="basis-5/12 grow relative rounded-xl flex flex-col items-center justify-center bg-amber-50 border border-amber-200 p-4 text-center">
        <p className="text-amber-700 font-semibold text-sm">Chưa cấu hình Bản đồ (MAP_NAME / API_KEY)</p>
        <p className="text-amber-600 text-xs mt-1">Vui lòng kiểm tra file apps/client/.env</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="basis-5/12 grow relative rounded-xl flex items-center justify-center bg-gray-100">
        <p className="text-gray-500 text-sm">Đang tải...</p>
      </div>
    );
  }

  if (isError || !properties) {
    return (
      <div className="basis-5/12 grow relative rounded-xl flex items-center justify-center bg-gray-100">
        <p className="text-red-500 text-sm">Không thể tải!</p>
      </div>
    );
  }

  return (
    <div className="basis-5/12 grow h-full relative rounded-xl overflow-hidden">
      <div
        ref={mapContainerRef}
        className="map-container rounded-xl"
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
};

const createPropertyMarker = (property: Property, map: maplibregl.Map): maplibregl.Marker | null => {
  const { coordinates } = property?.location || {};
  if (!coordinates?.longitude || !coordinates?.latitude) return null;

  const markerEl = document.createElement("div");
  Object.assign(markerEl.style, {
    background: "#1a1a1a",
    color: "#fff",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    whiteSpace: "nowrap",
    transition: "transform 0.15s ease",
  });
  markerEl.textContent = `${property.pricePerMonth?.toLocaleString("vi-VN")} VNĐ/tháng`;

  markerEl.addEventListener("mouseenter", () => {
    markerEl.style.transform = "scale(1.1)";
    markerEl.style.background = "#3b82f6";
  });
  markerEl.addEventListener("mouseleave", () => {
    markerEl.style.transform = "scale(1)";
    markerEl.style.background = "#1a1a1a";
  });

  const popup = new maplibregl.Popup({
    offset: 30,
    closeButton: false,
    maxWidth: "220px",
  }).setHTML(`
    <div style="padding: 10px; font-family: system-ui, sans-serif;">
      <a
        href="/search/${property.id}"
        target="_blank"
        style="font-weight: 700; font-size: 14px; color: #1a1a1a; text-decoration: none; display: block; margin-bottom: 4px;"
      >
        ${property.name}
      </a>
      <p style="margin: 0; font-size: 13px; color: #555;">
        <strong>${property.pricePerMonth?.toLocaleString("vi-VN")} VNĐ</strong> / tháng
      </p>
      <p style="margin: 4px 0 0; font-size: 12px; color: #888;">
        ${property.beds} phòng ngủ · ${property.baths} WC
      </p>
    </div>
  `);

  const marker = new maplibregl.Marker({ element: markerEl })
    .setLngLat([coordinates.longitude, coordinates.latitude])
    .setPopup(popup)
    .addTo(map);

  return marker;
};

export default Map;