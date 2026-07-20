import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth";
import { Manager, Property, Tenant, User } from "@shared/types";
import { cleanParams, createNewUserInDatabase, withToast } from "@/lib/utils";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { FiltersState } from ".";

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    prepareHeaders: async (headers) => {
      const session = await fetchAuthSession();
      const { idToken } = session.tokens ?? {};
      if (idToken) {
        headers.set("Authorization", `Bearer ${idToken}`)
      }
      return headers;
    }
  }),
  reducerPath: "api",
  tagTypes: ["Managers", "Tenants", "Properties"],
  endpoints: (build) => ({
    getAuthUser: build.query<User, void>({
      queryFn: async (_, _queryApi, _extraoptions, fetchWithBQ) => {
        try {
          const session = await fetchAuthSession();
          const { idToken } = session.tokens ?? {};
          const user = await getCurrentUser();
          const userRole = (idToken?.payload["custom:role"] as "manager" | "tenant") || "tenant";

          const endpoint = 
            userRole === "manager"
              ? `/manager/${user.userId}`
              : `/tenant/${user.userId}`;

          let userDetailsResponse = await fetchWithBQ(endpoint);
          
          if ((userDetailsResponse.error) && (userDetailsResponse.error.status === 404)) {
            userDetailsResponse = await createNewUserInDatabase(
              user,  
              idToken,
              userRole,
              fetchWithBQ
            );
          }

          return {
            data: {
              cognitoInfo: { ...user },
              userInfo: userDetailsResponse.data as Tenant | Manager,
              userRole
            }
          };

        } catch (error) {
          return {
            error: {
              status: "CUSTOM_ERROR",
              error: (error as Error).message || "Could not fetch user data",
              data: null
            } as FetchBaseQueryError
          };
        }
      }
    }),

    updateTenantSettings: build.mutation<Tenant, {cognitoId: string} & Partial<Tenant>>({
      query: ({cognitoId, ...updateTenantDto}) => ({
        url: `tenant/${cognitoId}`,
        method: "PATCH",
        body: updateTenantDto
      }),
      invalidatesTags: (result) => [{ type: "Tenants", id: result?.id}]
    }),

    getProperties: build.query<
      Property[], 
      Partial<FiltersState> & { favorites?: number[]}
      >({
        query: (filters) => {
          const params = cleanParams({
            location: filters.location,
            priceMin: filters.priceRange?.[0],
            priceMax: filters.priceRange?.[1],
            beds: filters.beds,
            baths: filters.baths,
            propertyType: filters.propertyType,
            squareFeetMin: filters.squareFeet?.[0],
            squareFeetMax: filters.squareFeet?.[1],
            amenities: filters.amenities?.join(","),
            availableFrom: filters.availableFrom,
            favoriteIds: filters.favorites?.join(","),
            latitude: filters.coordinates?.[1],
            longitude: filters.coordinates?.[0],
          });

          return { url: "properties", params };
        },
        providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Properties" as const, id })),
              { type: "Properties", id: "LIST" },
            ]
          : [{ type: "Properties", id: "LIST" }],
        async onQueryStarted(_, { queryFulfilled }) {
          await withToast(queryFulfilled, {
            error: "Failed to fetch properties.",
          });
        },
      }), 

    updateManagerSettings: build.mutation<Manager, {cognitoId: string} & Partial<Manager>>({
      query: ({cognitoId, ...updateManagerDto}) => ({
        url: `manager/${cognitoId}`,
        method: "PATCH",
        body: updateManagerDto
      }),
      invalidatesTags: (result) => [{ type: "Managers", id: result?.id}]
    }),

    getTenant: build.query<Tenant, string>({
      query: (cognitoId) => `tenant/${cognitoId}`,
      providesTags: (result) => [{ type: "Tenants", id: result?.id }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to load tenant profile."
        })
      }
    }),

    addFavoriteProperty: build.mutation<
    Tenant,
    {cognitoId: string, propertyId: number}
    >({
      query: ({ cognitoId, propertyId }) => ({
        url: `tenants/${cognitoId}/favorites/${propertyId}`,
        method: "POST",
      }),
      invalidatesTags: (result) => [
        { type: "Tenants", id: result?.id },
        { type: "Properties", id: "LIST" },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Added to favorites!!",
          error: "Failed to add to favorites."
        });
      },
    }),

    removeFavoriteProperty: build.mutation<
      Tenant,
      { cognitoId: string; propertyId: number }
      >({
        query: ({ cognitoId, propertyId }) => ({
          url: `tenants/${cognitoId}/favorites/${propertyId}`,
          method: "DELETE",
        }),
        invalidatesTags: (result) => [
          { type: "Tenants", id: result?.id },
          { type: "Properties", id: "LIST" },
        ],
        async onQueryStarted(_, { queryFulfilled }) {
          await withToast(queryFulfilled, {
            success: "Removed from favorites!!",
            error: "Failed to remove from favorites."
          });
        },
      }),

    getManagerProperties: build.query<Property[], string>({
      query: (cognitoId) => `manager/${cognitoId}/properties`,
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: "Properties" as const, id })),
            { type: "Properties", id: "LIST" },
          ]
          : [{ type: "Properties", id: "LIST" }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to load properties.",
        });
      },
    }),
  }),
});

export const {
  useGetAuthUserQuery,
  useUpdateTenantSettingsMutation,
  useUpdateManagerSettingsMutation,
  useGetTenantQuery,
  useAddFavoritePropertyMutation,
  useRemoveFavoritePropertyMutation,
  useGetManagerPropertiesQuery,
  useGetPropertiesQuery
} = api;