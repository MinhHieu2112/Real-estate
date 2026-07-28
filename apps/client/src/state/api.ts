import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth";
import { Application, Lease, Manager, Payment, Property, Tenant, User } from "@shared/types";
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
  tagTypes: ["Managers", "Tenants", "Properties", "PropertyDetails", "Applications", "Leases", "Payments"],
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
              ? `/managers/${user.userId}`
              : `/tenants/${user.userId}`;

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

    getTenant: build.query<Tenant, string>({
      query: (cognitoId) => `tenants/${cognitoId}`,
      providesTags: (result) => [{ type: "Tenants", id: result?.id }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to load tenant profile."
        })
      }
    }),

    updateTenantSettings: build.mutation<Tenant, {cognitoId: string} & Partial<Tenant>>({
      query: ({cognitoId, ...updateTenantDto}) => ({
        url: `tenants/${cognitoId}`,
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

      getProperty: build.query<Property, number>({
        query: (id) => `properties/${id}`,
        providesTags: (result, error, id) => [{ type: "PropertyDetails", id}],
        async onQueryStarted(_, { queryFulfilled }) {
          await withToast(queryFulfilled, {
            error: "Failed to fetch properties.",
          });
        }
      }),

    updateManagerSettings: build.mutation<Manager, {cognitoId: string} & Partial<Manager>>({
      query: ({cognitoId, ...updateManagerDto}) => ({
        url: `managers/${cognitoId}`,
        method: "PATCH",
        body: updateManagerDto
      }),
      invalidatesTags: (result) => [{ type: "Managers", id: result?.id}]
    }),

    getManagerProperties: build.query<Property[], string>({
      query: (cognitoId) => `managers/${cognitoId}/properties`,
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

      createApplication: build.mutation<Application, Partial<Application>> ({
        query: (body) => ({
          url: `applications`,
          method: "POST",
          body: body,
        }),
      }),

      getApplications: build.query<
        Application[],
        { userId?: string; userType?: string }> ({
          query: (params) => {
            const queryParams = new URLSearchParams();
            if (params.userId) {
              queryParams.append("userId", params.userId.toString());
            }
            if (params.userType) {
              queryParams.append("userType", params.userType.toString());
            }
            return `applications?${queryParams.toString()}`;
          },
          providesTags: ["Applications"],
          async onQueryStarted(_, { queryFulfilled }) {
            await withToast(queryFulfilled, {
              error: "Failed to fetch applications."
            });
          },
        }),

      updateApplicationStatus: build.mutation<
        Application & { lease?: Lease },
        { id: number; status: string }
      >({
        query: ({ id, status }) => ({
          url: `applications/${id}/status`,
          method: "PUT",
          body: { status },
        }),
        invalidatesTags: ["Applications", "Leases"],
        async onQueryStarted(_, { queryFulfilled }) {
          await withToast(queryFulfilled, {
            success: "Application status updated successfully!",
            error: "Failed to update application settings.",
          });
        },
      }),

      getPropertyLeases: build.query<Lease[], number>({
        query: (propertyId) => `properties/${propertyId}/leases`,
        providesTags: ["Leases"],
        async onQueryStarted(_, { queryFulfilled }) {
          await withToast(queryFulfilled, {
            error: "Failed to fetch property leases.",
          });
        },
      }),

      getPayments: build.query<Payment[], number>({
        query: (leaseId) => `leases/${leaseId}/payments`,
        providesTags: ["Payments"],
        async onQueryStarted(_, { queryFulfilled }) {
          await withToast(queryFulfilled, {
            error: "Failed to fetch payment info.",
          });
        },
      }),

      getCurrentResidences: build.query<Property[], string>({
        query: (cognitoId) => `tenants/${cognitoId}/current-residences`,
        providesTags: (result) =>
          result
            ? [
                ...result.map(({ id }) => ({ type: "Properties" as const, id })),
                { type: "Properties", id: "LIST" },
              ]
            : [{ type: "Properties", id: "LIST" }],
        async onQueryStarted(_, { queryFulfilled }) {
          await withToast(queryFulfilled, {
            error: "Failed to fetch current residences.",
          });
        },
      }),

      getLeases: build.query<Lease[], number>({
        query: () => "leases",
        providesTags: ["Leases"],
        async onQueryStarted(_, { queryFulfilled }) {
          await withToast(queryFulfilled, {
            error: "Failed to fetch leases.",
          });
        },
      }),

      createProperty: build.mutation<Property, FormData>({
        query: (newProperty) => ({
          url: `properties`,
          method: "POST",
          body: newProperty,
        }),
        invalidatesTags: (result) => [
          { type: "Properties", id: "LIST" },
          { type: "Managers", id: result?.manager?.id },
        ],
        async onQueryStarted(_, { queryFulfilled }) {
          await withToast(queryFulfilled, {
            success: "Property created successfully!",
            error: "Failed to create property.",
          });
        },
      }),

      updateProperty: build.mutation<
        Property,
        { id: number; formData: FormData }
      >({
        query: ({ id, formData }) => ({
          url: `properties/${id}`,
          method: "PATCH",
          body: formData,
        }),
        invalidatesTags: (result, error, { id }) => [
          { type: "Properties", id },
          { type: "Properties", id: "LIST" },
          { type: "PropertyDetails", id },
        ],
        async onQueryStarted(_, { queryFulfilled }) {
          await withToast(queryFulfilled, {
            success: "Property updated successfully!",
            error: "Failed to update property.",
          });
        },
      }),
    }),
  });

export const {
  useGetAuthUserQuery,
  useGetApplicationsQuery,
  useGetTenantQuery,
  useGetPaymentsQuery,
  useGetLeasesQuery,
  useGetPropertyQuery,
  useGetPropertiesQuery,
  useGetPropertyLeasesQuery,
  useGetManagerPropertiesQuery,
  useGetCurrentResidencesQuery,
  useUpdateTenantSettingsMutation,
  useUpdateManagerSettingsMutation,
  useAddFavoritePropertyMutation,
  useRemoveFavoritePropertyMutation,
  useCreatePropertyMutation,
  useUpdatePropertyMutation,
  useCreateApplicationMutation,
  useUpdateApplicationStatusMutation
} = api;