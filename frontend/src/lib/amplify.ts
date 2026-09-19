import { Amplify } from "aws-amplify";

/**
 * Amazon Cognito settings, from build-time environment variables:
 *   NEXT_PUBLIC_COGNITO_USER_POOL_ID  e.g. us-east-1_AbC123xyz
 *   NEXT_PUBLIC_COGNITO_CLIENT_ID     the web app client (no secret)
 *   NEXT_PUBLIC_COGNITO_DOMAIN        e.g. radius-abc.auth.us-east-1.amazoncognito.com (needed for Google)
 */
const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "";
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";
const domain = (process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");

export const isAuthConfigured = Boolean(userPoolId && userPoolClientId);
export const isGoogleEnabled = isAuthConfigured && Boolean(domain);

let configured = false;

/** Configures Amplify once, in the browser. Redirects come back to whichever site is running. */
export function configureAmplify(): void {
  if (configured || !isAuthConfigured || typeof window === "undefined") return;
  const origin = window.location.origin;
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          email: true,
          ...(domain
            ? {
                oauth: {
                  domain,
                  scopes: ["openid", "email", "profile"],
                  redirectSignIn: [`${origin}/auth/callback`],
                  redirectSignOut: [`${origin}/`],
                  responseType: "code" as const,
                  providers: ["Google" as const],
                },
              }
            : {}),
        },
      },
    },
  });
  configured = true;
}
