import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth";
import { Manager, Tenant, User } from "@shared/types";
import { createNewUserInDatabase } from "@/lib/utils";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query/react";

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
  tagTypes: ["Managers", "Tenants"],
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

    updateManagerSettings: build.mutation<Manager, {cognitoId: string} & Partial<Manager>>({
      query: ({cognitoId, ...updateManagerDto}) => ({
        url: `manager/${cognitoId}`,
        method: "PATCH",
        body: updateManagerDto
      }),
      invalidatesTags: (result) => [{ type: "Managers", id: result?.id}]
    }),
  }),
});

export const {
  useGetAuthUserQuery,
  useUpdateTenantSettingsMutation,
  useUpdateManagerSettingsMutation
} = api;