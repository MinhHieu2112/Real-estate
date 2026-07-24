"use client";

import { useGetPropertyQuery } from "@/state/api";
import { Compass, MapPin } from "lucide-react";
import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  withIdentityPoolId,
  withCredentialProvider,
} from "@aws/amazon-location-utilities-auth-helper";
import { fetchAuthSession } from "aws-amplify/auth";

const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";
const MAP_NAME = process.env.NEXT_PUBLIC_AWS_LOCATION_MAP_NAME || "";
const IDENTITY_POOL_ID = process.env.NEXT_PUBLIC_AWS_COGNITO_IDENTITY_POOL_ID!;
const USER_POOL_ID = process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID!;
const MAP_STYLE_URL = MAP_NAME
  ? `https://maps.geo.${AWS_REGION}.amazonaws.com/maps/v0/maps/${MAP_NAME}/style-descriptor`
  : "";

const PropertyLocation = ({ propertyId }: PropertyDetailsProps) => {
    const {
        data: property,
        isError,
        isLoading,
    } = useGetPropertyQuery(propertyId);
    const mapContainerRef = useRef(null);

    useEffect(() => {
    if (!MAP_NAME || !property) return;
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
            console.warn("[PropertyLocation] Falling back to guest identity pool auth:", err);
            authHelper = await withIdentityPoolId(IDENTITY_POOL_ID);
        }

        map = new maplibregl.Map({
            container: mapContainerRef.current!,
            style: MAP_STYLE_URL,
            center: [
                property?.location?.coordinates.longitude,
                property?.location?.coordinates.latitude,
            ],
            zoom: 14,
            ...authHelper.getMapAuthenticationOptions(),
        });

        new maplibregl.Marker().setLngLat([
            property?.location?.coordinates.longitude,
            property?.location?.coordinates.latitude,
        ])
        .addTo(map);
    };

    initMap();

    return () => {
        map?.remove();
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