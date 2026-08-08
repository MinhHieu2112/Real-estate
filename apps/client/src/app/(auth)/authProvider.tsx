"use client";

import React, { useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import { Authenticator, useAuthenticator, View, Heading, RadioGroupField, Radio } from '@aws-amplify/ui-react';
import { usePathname, useRouter } from 'next/navigation';
// https://docs.amplify.aws/gen1/javascript/tools/libraries/configure-categories/
Amplify.configure({
    Auth: {
         Cognito: {
            userPoolId: process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID!,
            userPoolClientId: process.env.NEXT_PUBLIC_AWS_COGNITO_CLIENT_ID!,
            identityPoolId: process.env.NEXT_PUBLIC_AWS_COGNITO_IDENTITY_POOL_ID!,
        },
    },
});

const components = {
    Header() {
        return (
            <View className="mt-4 mb-7">
                <Heading level={3} className="!text-2xl !font-bold">
                    RENT
                    <span className="text-secondary-500 font-light hover:!text-primary-300">
                        IFUL
                    </span>
                </Heading>
            </View>
        );
    },
    ForgotPassword: {
        Header() {
            return (
                <Heading level={4} className="!text-lg !font-semibold !mb-4">
                </Heading>
            );
        },
    },
    SignIn: {
        Footer() {
            const { toSignUp, toForgotPassword } = useAuthenticator();
            return (
                <View className="mt-4 mb-7">
                    <button
                        type="button"
                        onClick={toForgotPassword}
                        className="text-sm text-primary hover:underline bg-transparent border-none p-0 text-left"
                        >
                            Forgot your password?
                    </button>
                    <p className="text-muted-foreground text-sm">
                        Don&apos;t have an account?{" "}
                        <button
                            onClick={toSignUp}
                            className="text-sm text-primary hover:underline bg-transparent border-none p-0">
                                Sign up here
                        </button>
                    </p>
                </View>
            );
        },
        
    },
    SignUp: {
        FormFields() {
            const { validationErrors } = useAuthenticator();

            return (
                <>
                    <Authenticator.SignUp.FormFields/>
                    <RadioGroupField 
                        legend="Role"
                        name="custom:role"
                        errorMessage={validationErrors?.["custom:role"]}
                        hasError={!!validationErrors?.["custom:role"]}
                        isRequired
                    >
                        <Radio value="tenant">Tenant</Radio>
                        <Radio value="manager">Manager</Radio>
                    </RadioGroupField>
                </>
            )
        },

        Footer() {
            const { toSignIn } = useAuthenticator();
            return (
                <View className="mt-4 mb-7">
                    <p className="text-muted-foreground text-sm">
                        Already have an account?{" "}
                        <button
                            onClick={toSignIn}
                            className="text-primary hover:underline bg-transparent border-none p-0">
                                Login here
                        </button>
                    </p>
                </View>
            );
        },
    }
};

const formFields = {
    signIn: {
        username: {
            placeholder: "Enter your email",
            label: "Email",
            isRequired: true
        },
        password: {
            placeholder: "Enter your password",
            label: "Password",
            isRequired: true
        }
    },
    signUp: {
        username: {
            order: 1,
            placeholder: "Choose a username",
            label: "Username",
            isRequired: true
        },
        email: {
            order: 2,
            placeholder: "Enter your email",
            label: "Email",
            isRequired: true
        },
        password: {
            order: 3,
            placeholder: "Enter your password",
            label: "Password",
            isRequired: true
        },
        confirm_password: {
            order: 4,
            placeholder: "Confirm your password",
            label: "Confirm Password",
            isRequired: true
        }
    },
    forgotPassword: {
        username: {
            placeholder: "Enter your email",
            label: "Email",
            isRequired: true
        },
    },
    confirmResetPassword: {
        password: {
            placeholder: "Enter your password",
            label: "Password",
            isRequired: true
        },
        confirm_password: {
            placeholder: "Confirm your password",
            label: "Confirm Password",
            isRequired: true
        }
    },
}

const Auth = ({ children } : { children: React.ReactNode}) => {
    const { user } = useAuthenticator((context) => [context.user]);
    const router = useRouter();
    const pathname = usePathname();

    const isAuthPage = pathname.match(/^\/(signin|signup)$/);
    const isDashboardPage = 
        pathname.startsWith("/manager") || pathname.startsWith("/tenants");
    
    // Redirect authenticated users away from auth pages
    useEffect(() => {
        if(user && isAuthPage) {
            router.push("/");
        }
    }, [user, isAuthPage, router]);

    // Allow access to public pages without authentication
    if (!isAuthPage && !isDashboardPage) {
        return <>{children}</>;
    }
    return (
        <div className={isAuthPage ? "flex justify-center items-center min-h-[calc(100vh-80px)] py-12" : "h-full"}>
            <Authenticator
                initialState={pathname.includes("signup") ? "signUp" : "signIn"}
                components={components}
                formFields={formFields}
            >
                {() => <>{children}</>}
            </Authenticator>
        </div>
    );
};

export default Auth;