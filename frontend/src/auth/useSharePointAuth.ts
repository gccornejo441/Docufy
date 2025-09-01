import { useMsal } from "@azure/msal-react";
import {
  InteractionRequiredAuthError,
  type AccountInfo,
} from "@azure/msal-browser";

const API_SCOPE =
  (import.meta.env.VITE_API_SCOPE as string | undefined) ??
  (import.meta.env.VITE_AZURE_API_SCOPE as string | undefined);

const GRAPH_SCOPES =
  (import.meta.env.VITE_GRAPH_SCOPES as string | undefined)
    ?.split(/[,\s]+/)
    .filter(Boolean) ?? [];

const REQUEST_SCOPES = API_SCOPE
  ? [API_SCOPE]
  : GRAPH_SCOPES.length
  ? GRAPH_SCOPES
  : ["User.Read"];

export function useSharePointAuth() {
  const { instance } = useMsal();

  const getAccount = (): AccountInfo | null => {
    const active = instance.getActiveAccount();
    if (active) return active;
    const all = instance.getAllAccounts();
    if (all.length) {
      instance.setActiveAccount(all[0]);
      return all[0];
    }
    return null;
  };

  const ensureSignedIn = async (): Promise<boolean> => {
    const acct = getAccount();
    if (acct) return true;
    await instance.loginRedirect({
      scopes: REQUEST_SCOPES,
      prompt: "select_account",
    });
    return false;
  };

  const getApiToken = async (): Promise<string> => {
    const account = getAccount();
    if (!account) throw new Error("No active account");
    try {
      const res = await instance.acquireTokenSilent({
        account,
        scopes: REQUEST_SCOPES,
      });
      return res.accessToken;
    } catch (e) {
      if (e instanceof InteractionRequiredAuthError) {
        await instance.acquireTokenRedirect({
          account,
          scopes: REQUEST_SCOPES,
        });
        return "";
      }
      throw e;
    }
  };

  return { ensureSignedIn, getApiToken };
}
