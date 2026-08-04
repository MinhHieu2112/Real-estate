import { Application, ChatConversation, Lease, Manager, Message, Notification, Payment, Property, Tenant, User } from "@shared/types";
import { cleanParams, createNewUserInDatabase, withToast } from "@/lib/utils";
import { createApi, fetchBaseQuery, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import { FiltersState } from ".";

export interface SearchPlaceResult {
  placeId?: string;
  label: string;
  position: [number, number];
  bbox?: [number, number, number, number]; // [west, south, east, north]
}

export interface AutocompleteResult {
  placeId?: string;
  label: string;
}

export interface DirectionsResult {
  duration: number;
  distance: number;
  legs: {
    startPosition: [number, number];
    endPosition: [number, number];
    distance: number;
    duration: number;
    steps: { startPosition: [number, number]; endPosition: [number, number]; distance: number; duration: number; }[];
  }[];
}

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
  tagTypes: ["Managers", "Tenants", "Properties", "PropertyDetails", "Applications", "Leases", "Payments", "Conversations", "Messages", "Notifications"],
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
            error: "Không thể tải danh sách bất động sản.",
          });
        },
      }), 

      getProperty: build.query<Property, number>({
        query: (id) => `properties/${id}`,
        providesTags: (result, error, id) => [{ type: "PropertyDetails", id}],
        async onQueryStarted(_, { queryFulfilled }) {
          await withToast(queryFulfilled, {
            error: "Không thể tải chi tiết bất động sản.",
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
          error: "Không thể tải bất động sản.",
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
          success: "Đã thêm vào yêu thích!",
          error: "Không thể thêm vào yêu thích."
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
            success: "Đã xóa khỏi yêu thích!",
            error: "Không thể xóa khỏi yêu thích."
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
              error: "Không thể tải danh sách đơn đăng ký."
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
            success: "Cập nhật trạng thái đơn đăng ký thành công!",
            error: "Không thể cập nhật trạng thái đơn đăng ký.",
          });
        },
      }),

      getPropertyLeases: build.query<Lease[], number>({
        query: (propertyId) => `properties/${propertyId}/leases`,
        providesTags: ["Leases"],
        async onQueryStarted(_, { queryFulfilled }) {
          await withToast(queryFulfilled, {
            error: "Không thể tải hợp đồng thuê bất động sản.",
          });
        },
      }),

      getPayments: build.query<Payment[], number>({
        query: (leaseId) => `leases/${leaseId}/payments`,
        providesTags: ["Payments"],
        async onQueryStarted(_, { queryFulfilled }) {
          await withToast(queryFulfilled, {
            error: "Không thể tải thông tin thanh toán.",
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
            error: "Không thể tải danh sách nơi ở hiện tại.",
          });
        },
      }),

      getLeases: build.query<Lease[], number>({
        query: () => "leases",
        providesTags: ["Leases"],
        async onQueryStarted(_, { queryFulfilled }) {
          await withToast(queryFulfilled, {
            error: "Không thể tải danh sách hợp đồng thuê.",
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
            success: "Tạo bất động sản thành công!",
            error: "Không thể tạo bất động sản.",
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
            success: "Cập nhật bất động sản thành công!",
            error: "Không thể cập nhật bất động sản.",
          });
        },
      }),

      searchPlace: build.query<SearchPlaceResult | null, string>({
        query: (queryText: string) =>
          `locations/search?query=${encodeURIComponent(queryText)}`,
        async onQueryStarted(_: string, { queryFulfilled }: { queryFulfilled: Promise<any> }) {
          await withToast(queryFulfilled, {
            error: "Không thể tìm kiếm vị trí.",
          });
        },
      }),

      // Autocomplete address for search input (debounced).
      autocompleteAddress: build.query<AutocompleteResult[], string>({
        query: (queryText: string) =>
          `locations/autocomplete?query=${encodeURIComponent(queryText)}`,
      }),

      // Get turn-by-turn directions to a property.
      getDirections: build.query<
        DirectionsResult,
        { originLat: number; originLng: number; destinationLat: number; destinationLng: number; travelMode?: string }
      >({
        query: (params: { originLat: number; originLng: number; destinationLat: number; destinationLng: number; travelMode?: string }) => ({ url: 'locations/directions', params: cleanParams(params) }),
        async onQueryStarted(_: any, { queryFulfilled }: { queryFulfilled: Promise<any> }) {
          await withToast(queryFulfilled, {
            error: "Không thể tải chỉ đường.",
          });
        },
      }),

      // ─── Chat ──────────────────────────────────────────────────────────────

      getConversations: build.query<ChatConversation[], string>({
        query: (userCognitoId: string) => ({ url: "messages/conversations", params: { userCognitoId } }),
        providesTags: ["Conversations"],
      }),

      getOrCreateConversation: build.mutation<ChatConversation, { tenantCognitoId: string; managerCognitoId: string }>({
        query: (body: { tenantCognitoId: string; managerCognitoId: string }) => ({ url: "messages/conversations", method: "POST", body }),
        invalidatesTags: ["Conversations"],
      }),

      getMessages: build.query<Message[], number>({
        query: (conversationId: number) => ({ url: "messages", params: { conversationId } }),
        providesTags: (result: Message[] | undefined, error: any, conversationId: number) =>
          result ? [{ type: "Messages", id: conversationId }] : [],
      }),

      sendMessage: build.mutation<Message, { conversationId: number; senderCognitoId: string; content: string }>({
        query: (body: { conversationId: number; senderCognitoId: string; content: string }) => ({ url: "messages", method: "POST", body }),
        invalidatesTags: (result: Message | undefined) =>
          result ? [{ type: "Messages", id: result.conversationId }, "Conversations"] : [],
      }),

      // ─── Notifications ────────────────────────────────────────────────────────

      getNotifications: build.query<Notification[], string>({
        query: (userId: string) => ({ url: "notify", params: { userId } }),
        providesTags: ["Notifications"],
      }),

      markNotificationAsRead: build.mutation<Notification, number>({
        query: (id: number) => ({ url: `notify/${id}/read`, method: "PATCH" }),
        invalidatesTags: ["Notifications"],
      }),

      markAllNotificationsAsRead: build.mutation<{ count: number }, string>({
        query: (userId: string) => ({ url: "notify/read-all", method: "PATCH", params: { userId } }),
        invalidatesTags: ["Notifications"],
      }),

      markAsRead: build.mutation<{ updatedCount: number }, { conversationId: number; userCognitoId: string }>({
        query: ({ conversationId, userCognitoId }: { conversationId: number; userCognitoId: string }) => ({
          url: `messages/conversations/${conversationId}/read`,
          method: "PATCH",
          body: { userCognitoId },
        }),
        invalidatesTags: ["Conversations"],
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
  useUpdateApplicationStatusMutation,
  useSearchPlaceQuery,
  useAutocompleteAddressQuery,
  useGetDirectionsQuery,
  // Chat
  useGetConversationsQuery,
  useGetOrCreateConversationMutation,
  useGetMessagesQuery,
  useSendMessageMutation,
  useMarkAsReadMutation,
  // Notifications
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
} = api;