import { z } from "zod";

const errorSchema = z.object({
  error: z.string(),
});

export interface ApiAuthHeaders {
  privyUserId?: string | null;
  email?: string | null;
  displayName?: string | null;
  phoneNumber?: string | null;
  starknetAddress?: string | null;
  tongoRecipientId?: string | null;
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  accessToken?: string | null;
  auth?: ApiAuthHeaders;
  body?: unknown;
}

export async function apiFetch<T>(
  input: string,
  { accessToken, auth, body, headers, ...init }: ApiFetchOptions = {}
): Promise<T> {
  const requestHeaders = new Headers(headers);

  if (accessToken) {
    requestHeaders.set("authorization", `Bearer ${accessToken}`);
  }

  if (auth?.privyUserId) {
    requestHeaders.set("x-privy-user-id", auth.privyUserId);
  }
  if (auth?.email) {
    requestHeaders.set("x-user-email", auth.email);
  }
  if (auth?.displayName) {
    requestHeaders.set("x-user-name", auth.displayName);
  }
  if (auth?.phoneNumber) {
    requestHeaders.set("x-user-phone", auth.phoneNumber);
  }
  if (auth?.starknetAddress) {
    requestHeaders.set("x-wallet-address", auth.starknetAddress);
  }
  if (auth?.tongoRecipientId) {
    requestHeaders.set("x-tongo-recipient-id", auth.tongoRecipientId);
  }

  if (body !== undefined) {
    requestHeaders.set("content-type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();

    try {
      const parsed = errorSchema.parse(JSON.parse(text));
      throw new Error(parsed.error);
    } catch {
      throw new Error(text || `Request failed with status ${response.status}`);
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
