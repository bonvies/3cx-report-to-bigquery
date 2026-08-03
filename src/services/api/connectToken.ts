import axios from 'axios';
import { config } from '@/config.js';
import describeError from '@/util/describeError.js';

type TokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  try {
    const response = await axios.post<TokenResponse>(
      `${config.threeCx.baseUrl}/connect/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.threeCx.clientId,
        client_secret: config.threeCx.clientSecret,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    cachedToken = {
      value: response.data.access_token,
      expiresAt: Date.now() + (response.data.expires_in - 60) * 1000,
    };
    return cachedToken.value;
  } catch (error) {
    throw new Error(`3CX token request failed: ${describeError(error)}`);
  }
}

export const axios3CXInstance = axios.create({
  baseURL: config.threeCx.baseUrl,
});

axios3CXInstance.interceptors.request.use(async (requestConfig) => {
  const token = await getAccessToken();
  requestConfig.headers.Authorization = `Bearer ${token}`;
  return requestConfig;
});