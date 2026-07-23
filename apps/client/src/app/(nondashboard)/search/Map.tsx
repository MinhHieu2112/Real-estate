"use client";

import { useGetPropertiesQuery } from "@/state/api";
import { useAppSelector } from "@/state/redux";
import { Property } from "@shared/types";
import {
  withIdentityPoolId,
  withCredentialProvider,
} from "@aws/amazon-location-utilities-auth-helper";
import { fetchAuthSession } from "aws-amplify/auth";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import React, { useEffect, useRef } from "react";

const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";
const IDENTITY_POOL_ID = process.env.NEXT_PUBLIC_AWS_COGNITO_IDENTITY_POOL_ID!;
const USER_POOL_ID = process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID!;
const MAP_NAME = process.env.NEXT_PUBLIC_AWS_LOCATION_MAP_NAME || "";

// Amazon Location Service style descriptor endpoint
const MAP_STYLE_URL = MAP_NAME
  ? `https://maps.geo.${AWS_REGION}.amazonaws.com/maps/v0/maps/${MAP_NAME}/style-descriptor`
  : "";

const Map = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const filters = useAppSelector((state) => state.global.filters);

  const {
    data: properties,
    isLoading,
    isError,
  } = useGetPropertiesQuery(filters);

  useEffect(() => {
    if (isLoading || isError || !properties || !mapContainerRef.current || !MAP_NAME) return;

    let map: maplibregl.Map;

    const initMap = async () => {
      let authHelper;
      try {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();

        if (session.credentials) {
          authHelper = await withCredentialProvider(
            async () => session.credentials!,
            AWS_REGION
          );
        } else if (idToken && USER_POOL_ID) {
          authHelper = await withIdentityPoolId(IDENTITY_POOL_ID, {
            logins: {
              [`cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}`]: idToken,
            },
          });
        } else {
          authHelper = await withIdentityPoolId(IDENTITY_POOL_ID);
        }
      } catch (err) {
        console.warn("[Map] Falling back to guest identity pool auth:", err);
        authHelper = await withIdentityPoolId(IDENTITY_POOL_ID);
      }

      map = new maplibregl.Map({
        container: mapContainerRef.current!,
        style: MAP_STYLE_URL,
        center: filters.coordinates
          ? [filters.coordinates[0], filters.coordinates[1]]
          : [-74.5, 40],
        zoom: 9,
        ...authHelper.getMapAuthenticationOptions(),
      });

      map.addControl(new maplibregl.NavigationControl(), "top-right");

      map.on("load", () => {
        properties.forEach((property) => {
          addPropertyMarker(property, map);
        });
      });

      setTimeout(() => map.resize(), 700);
    };

    initMap().catch((err) => {
      console.error("[Map] Failed to initialize Amazon Location map:", err);
    });

    return () => {
      if (map) map.remove();
    };
  }, [isLoading, isError, properties, filters.coordinates]);

  if (!MAP_NAME) {
    return (
      <div className="basis-5/12 grow relative rounded-xl flex flex-col items-center justify-center bg-amber-50 border border-amber-200 p-4 text-center">
        <p className="text-amber-700 font-semibold text-sm">Chưa cấu hình tên Bản đồ (MAP_NAME)</p>
        <p className="text-amber-600 text-xs mt-1">Vui lòng điền NEXT_PUBLIC_AWS_LOCATION_MAP_NAME trong file apps/client/.env</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="basis-5/12 grow relative rounded-xl flex items-center justify-center bg-gray-100">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (isError || !properties) {
    return (
      <div className="basis-5/12 grow relative rounded-xl flex items-center justify-center bg-gray-100">
        <p className="text-red-500 text-sm">Failed to load!</p>
      </div>
    );
  }

  return (
    <div className="basis-5/12 grow relative rounded-xl overflow-hidden">
      <div
        ref={mapContainerRef}
        className="map-container rounded-xl"
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
};

const addPropertyMarker = (property: Property, map: maplibregl.Map) => {
  const { coordinates } = property?.location || {};
  if (!coordinates?.longitude || !coordinates?.latitude) return;
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
  markerEl.textContent = `$${property.pricePerMonth?.toLocaleString()}/mo`;

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
        <strong>$${property.pricePerMonth?.toLocaleString()}</strong> / tháng
      </p>
      <p style="margin: 4px 0 0; font-size: 12px; color: #888;">
        ${property.beds} phòng ngủ · ${property.baths} WC
      </p>
    </div>
  `);

  new maplibregl.Marker({ element: markerEl })
    .setLngLat([coordinates.longitude, coordinates.latitude])
    .setPopup(popup)
    .addTo(map);
};

export default Map;