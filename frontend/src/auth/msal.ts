import { PublicClientApplication } from "@azure/msal-browser";

export const pca = new PublicClientApplication({
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID!}`,
    redirectUri: window.location.origin,
  },
  cache: { cacheLocation: "sessionStorage" },
});

export const apiScopes = [import.meta.env.VITE_AZURE_API_SCOPE!];
