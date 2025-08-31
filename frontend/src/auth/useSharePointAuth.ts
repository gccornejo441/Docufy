import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { apiScopes } from "./msal";

export function useSharePointAuth() {
  const { instance, accounts } = useMsal();

  async function signInIfNeeded() {
    if (!accounts[0]) {
      await instance.loginPopup({ scopes: apiScopes });
    }
  }

  async function getApiToken() {
    const account = accounts[0];
    const req = { scopes: apiScopes, account };
    try {
      const res = await instance.acquireTokenSilent(req);
      return res.accessToken;
    } catch (e) {
      if (e instanceof InteractionRequiredAuthError) {
        const res = await instance.acquireTokenPopup(req);
        return res.accessToken;
      }
      throw e;
    }
  }

  return { signInIfNeeded, getApiToken };
}
