import {
  PublicClientApplication,
  type Configuration,
  LogLevel,
  type AccountInfo,
} from "@azure/msal-browser";

/** ---- env helpers ------------------------------------------------------- */
function requiredEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in your Vite env (e.g. .env.local).`
    );
  }
  return value;
}

const tenantId =
  (import.meta.env.VITE_AZURE_AD_TENANT_ID as string | undefined) ??
  (import.meta.env.VITE_AZURE_TENANT_ID as string | undefined);

const clientIdEnv =
  (import.meta.env.VITE_AZURE_AD_CLIENT_ID as string | undefined) ??
  (import.meta.env.VITE_AZURE_CLIENT_ID as string | undefined);

const clientId = requiredEnv(
  "VITE_AZURE_CLIENT_ID (or VITE_AZURE_AD_CLIENT_ID)",
  clientIdEnv
);

// Prefer explicit authority from env; otherwise prefer organizations (safer than /common).
const authority =
  (import.meta.env.VITE_AZURE_AD_AUTHORITY as string | undefined) ??
  (tenantId
    ? `https://login.microsoftonline.com/${tenantId}`
    : "https://login.microsoftonline.com/organizations");

const redirectUri =
  (import.meta.env.VITE_MSAL_REDIRECT_URI as string | undefined) ??
  `${window.location.origin}/`;

const postLogoutRedirectUri =
  (import.meta.env.VITE_MSAL_POST_LOGOUT_URI as string | undefined) ??
  `${window.location.origin}/`;

// 👇 Your backend API scope (from Expose an API → Application ID URI + scope name)
const apiScope = requiredEnv(
  "VITE_AZURE_API_SCOPE",
  import.meta.env.VITE_AZURE_API_SCOPE as string | undefined
);

/** ---- MSAL config ------------------------------------------------------- */
const config: Configuration = {
  auth: {
    clientId,
    authority,
    redirectUri,
    postLogoutRedirectUri,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      loggerCallback: (_level, message, containsPii) => {
        if (!containsPii) console.warn(message);
      },
    },
  },
};

export const pca = new PublicClientApplication(config);

/** ---- account helpers --------------------------------------------------- */
function getActive(): AccountInfo | null {
  return pca.getActiveAccount() || pca.getAllAccounts()[0] || null;
}

async function ensureSignedIn(): Promise<AccountInfo> {
  let account = getActive();
  if (account) return account;

  // Request only OIDC + your API scope. No Graph scopes needed in the SPA.
  const login = await pca.loginPopup({
    scopes: ["openid", "profile", "offline_access", apiScope],
  });
  account = login.account!;
  pca.setActiveAccount(account);
  return account;
}

/** ---- token acquisition for your backend API ---------------------------- */
export async function getApiToken(): Promise<string> {
  const account = await ensureSignedIn();

  try {
    const r = await pca.acquireTokenSilent({ scopes: [apiScope], account });
    return r.accessToken;
  } catch {
    const r = await pca.acquireTokenPopup({ scopes: [apiScope], account });
    return r.accessToken;
  }
}

/** ---- optional convenience exports ------------------------------------- */
export async function signIn(): Promise<void> {
  await ensureSignedIn();
}

export async function signOut(): Promise<void> {
  const account = getActive();
  await pca.logoutPopup({
    account: account ?? undefined,
    postLogoutRedirectUri,
  });
}

/** ---- initialize & set active account on refresh/redirect --------------- */
pca.initialize().then(async () => {
  const result = await pca.handleRedirectPromise();
  if (result?.account) pca.setActiveAccount(result.account);

  const all = pca.getAllAccounts();
  if (!pca.getActiveAccount() && all.length) pca.setActiveAccount(all[0]);

  // Expose helpers during local dev for easy debugging
  if (import.meta.env.DEV) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__sp = { getApiToken, pca, apiScope, authority };
  }
});
