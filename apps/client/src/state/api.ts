import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getCurrentUser, fetchAuthSession } from "aws-amplify/auth";
import { Manager, Tenant, User } from "@shared/types";

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
  tagTypes: [],
  endpoints: (build) => ({
    getAuthUser: build.query<User, void>({
      queryFn: async (_, _queryApi, _extraoptions, fetchWithBQ) => {
        try {
          const session = await fetchAuthSession();
          const { idToken } = session.tokens ?? {};
          const user = await getCurrentUser();
          const userRole = idToken?.payload["custom:role"] as string;

          const endpoint = 
            userRole === "manager"
              ? `/managers/${user.userId}`
              : `/tenants/${user.userId}`;

          const userDetailsResponse = await fetchWithBQ(endpoint);
          if (userDetailsResponse.error) {
            return {
              error: userDetailsResponse.error
            }
          }
            // if user doesn't exist, create new user
            return {
              data: {
                cognitoInfo: {...user},
                userInfo: userDetailsResponse.data as Tenant | Manager,
                userRole
              }
            }
        }catch (error) {
          return {
            error: {
              status: 401,
              data: {
                message: error instanceof Error ? error.message : "Unknown error",
              }
            }
          }
        }
      }
    })
  }),
});

export const {} = api;
