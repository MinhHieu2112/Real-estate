"use client";

import { useGetPropertyQuery, useGetDirectionsQuery } from "@/state/api";
import { MapPin, Car, Footprints, Navigation, Timer, X } from "lucide-react";
import React, { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@/components/ui/button";

const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";
const API_KEY = process.env.NEXT_PUBLIC_AWS_LOCATION_API_KEY || "";
const MAP_STYLE = "Standard";

const MAP_STYLE_URL = API_KEY
  ? `https://maps.geo.${AWS_REGION}.amazonaws.com/v2/styles/${MAP_STYLE}/descriptor?key=${API_KEY}`
  : "";

const ROUTE_SOURCE_ID = "route-source";
const ROUTE_LAYER_ID = "route-layer";
const ROUTE_OUTLINE_LAYER_ID = "route-outline-layer";

interface PropertyDetailsProps {
  propertyId: number;
}

const PropertyLocation = ({ propertyId }: PropertyDetailsProps) => {
  const {
    data: property,
    isError,
    isLoading,
  } = useGetPropertyQuery(propertyId);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const [showDirections, setShowDirections] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [travelMode, setTravelMode] = useState<"Car" | "Pedestrian">("Car");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const destLat = property?.location?.coordinates?.latitude;
  const destLng = property?.location?.coordinates?.longitude;

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

  useEffect(() => {
    if (!MAP_STYLE_URL || !property || !mapContainerRef.current) return;

    const coordinates = property?.location?.coordinates;
    if (!coordinates?.longitude || !coordinates?.latitude) return;
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE_URL,
      center: [coordinates.longitude, coordinates.latitude],
      zoom: 14,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: ROUTE_OUTLINE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#1e40af",
          "line-width": 7,
          "line-opacity": 0.35,
        },
      });

      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#3b82f6",
          "line-width": 4,
          "line-opacity": 0.9,
          "line-dasharray": [1, 0],
        },
      });

      setMapReady(true);
    });

    destMarkerRef.current = new maplibregl.Marker({ color: "#2563eb" })
      .setLngLat([coordinates.longitude, coordinates.latitude])
      .setPopup(
        new maplibregl.Popup({ offset: 25 }).setHTML(
          `<div class="text-sm font-semibold text-blue-700">${property.name}</div>
           <div class="text-xs text-gray-500">${property.location?.address ?? ""}</div>`
        )
      )
      .addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      destMarkerRef.current = null;
      setMapReady(false);
    };
  }, [property]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const source = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    if (!directions || !directions.geometry || directions.geometry.length === 0) {
      source.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    const routeGeoJSON = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: directions.geometry,
          },
        },
      ],
    };

    source.setData(routeGeoJSON);

    if (userLocation && destLat && destLng) {
      const bounds = new maplibregl.LngLatBounds();
      directions.geometry.forEach(([lng, lat]) => bounds.extend([lng, lat]));
      map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 900 });
    }
  }, [directions, mapReady, userLocation, destLat, destLng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
    } else {
      const el = document.createElement("div");
      el.className = "user-location-marker";
      el.style.cssText = `
        width: 18px; height: 18px; border-radius: 50%;
        background: #22c55e; border: 3px solid white;
        box-shadow: 0 0 0 3px rgba(34,197,94,0.35);
        cursor: default;
      `;

      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(new maplibregl.Popup({ offset: 16 }).setText("Vị trí của bạn"))
        .addTo(map);
    }
  }, [userLocation]);

  const handleGetLocationAndDirections = useCallback(() => {
    setShowDirections(true);
    if (!navigator.geolocation) {
      setGeoError("Trình duyệt của bạn không hỗ trợ định vị địa lý");
      setUserLocation({ lat: 10.7769, lng: 106.7009 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoError(null);
      },
      () => {
        setUserLocation({ lat: 10.7769, lng: 106.7009 });
        setGeoError("Đang sử dụng vị trí mặc định (Trung tâm TP.HCM). Hãy bật GPS để chỉ đường chính xác.");
      }
    );
  }, []);

  const handleClearDirections = useCallback(() => {
    setShowDirections(false);
    setUserLocation(null);
    setGeoError(null);

    // Remove user marker
    userMarkerRef.current?.remove();
    userMarkerRef.current = null;

    // Clear route layer
    const map = mapRef.current;
    if (map && mapReady) {
      const source = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      source?.setData({ type: "FeatureCollection", features: [] });

      // Re-centre on property
      if (destLng && destLat) {
        map.flyTo({ center: [destLng, destLat], zoom: 14, duration: 700 });
      }
    }
  }, [mapReady, destLat, destLng]);

  if (isLoading) return <>Đang tải...</>;
  if (isError || !property) return <>Không tìm thấy dự án</>;

  const durationMin = directions?.duration ? Math.round(directions.duration / 60) : null;
  const distanceKm = directions?.distance ? (directions.distance / 1000).toFixed(1) : null;

  return (
    <div className="py-12">
      <h3 className="text-xl font-semibold text-primary-800 dark:text-primary-100">
        Vị trí {property.name}
      </h3>

      {/* Header row */}
      <div className="flex flex-wrap justify-between items-center text-sm text-primary-500 mt-2 gap-2">
        <div className="flex items-center text-gray-500">
          <MapPin className="w-4 h-4 mr-1 text-gray-700" />
          Địa chỉ dự án:
          <span className="ml-2 font-semibold text-gray-700">
            {property.location?.address || "Địa chỉ không khả dụng"}
          </span>
        </div>

        <div className="flex gap-2">
          {showDirections ? (
            <Button
              onClick={handleClearDirections}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl"
            >
              <X className="w-4 h-4" /> Đóng chỉ đường
            </Button>
          ) : (
            <Button
              onClick={handleGetLocationAndDirections}
              variant="outline"
              className="flex items-center gap-2 border-primary-500 text-primary-700 hover:bg-primary-50 rounded-xl"
            >
              <Navigation className="w-4 h-4 text-primary-600" />
              Xem chỉ đường
            </Button>
          )}
        </div>
      </div>

      {/* Directions Panel */}
      {showDirections && (
        <div className="mt-4 p-4 bg-primary-50 border border-primary-200 rounded-xl space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-primary-900 flex items-center gap-2">
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
              <div className="flex flex-wrap gap-6 font-medium text-base items-center">
                <span className="flex items-center gap-1.5">
                  <Timer className="w-5 h-5 text-primary-700" />
                  Thời gian dự kiến:{" "}
                  <strong className="text-primary-700">{durationMin} phút</strong>
                </span>
                <span>
                  Khoảng cách:{" "}
                  <strong className="text-primary-700">{distanceKm} km</strong>
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Được hỗ trợ bởi AWS GeoRoutes v2 — Tuyến đường được vẽ trực tiếp trên bản đồ.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Đang lấy tọa độ để chỉ đường...</p>
          )}
        </div>
      )}

      {/* Map */}
      <div
        className="relative mt-4 h-[400px] rounded-xl overflow-hidden border border-gray-200 shadow-sm"
        ref={mapContainerRef}
      />

      {/* Legend */}
      {showDirections && userLocation && (
        <div className="flex items-center gap-5 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow" />
            Vị trí của bạn
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow" />
            {property.name}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-7 h-1 rounded bg-blue-500 opacity-90" />
            Tuyến đường
          </span>
        </div>
      )}
    </div>
  );
};

export default PropertyLocation;