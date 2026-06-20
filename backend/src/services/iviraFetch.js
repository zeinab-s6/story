import { Agent, ProxyAgent, fetch as undiciFetch } from 'undici';
import env from '../config/env.js';

let sharedAgent;

function getDispatcher() {
  if (sharedAgent) {
    return sharedAgent;
  }

  const connectTimeout = env.IVIRA_CONNECT_TIMEOUT_MS;
  const proxyUrl = env.IVIRA_PROXY_URL?.trim();

  if (proxyUrl) {
    sharedAgent = new ProxyAgent({
      uri: proxyUrl,
      requestTls: { rejectUnauthorized: true },
      proxyTls: { rejectUnauthorized: true },
      connectTimeout,
    });
    return sharedAgent;
  }

  sharedAgent = new Agent({
    connect: { timeout: connectTimeout },
  });
  return sharedAgent;
}

function isConnectFailure(err) {
  const code = err?.cause?.code || err?.code;
  return [
    'UND_ERR_CONNECT_TIMEOUT',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ECONNRESET',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'ENOTFOUND',
  ].includes(code);
}

export function mapIviraFetchError(err, baseUrl) {
  if (isConnectFailure(err)) {
    const error = new Error(
      'اتصال به سرویس آواشو (ویرا) برقرار نشد. VPN خارج از ایران را خاموش کنید یا از VPN/شبکه ایران استفاده کنید. در صورت نیاز IVIRA_PROXY_URL را در .env تنظیم کنید.',
    );
    error.statusCode = 502;
    error.code = 'IVIRA_CONNECT_FAILED';
    if (!env.isProduction) {
      error.details = `${err?.cause?.code || err?.code || err?.message} → ${baseUrl}`;
    }
    return error;
  }

  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
    const error = new Error('زمان انتظار برای پاسخ آواشو (ویرا) تمام شد. دوباره تلاش کنید.');
    error.statusCode = 504;
    error.code = 'IVIRA_TIMEOUT';
    if (!env.isProduction) {
      error.details = err.message;
    }
    return error;
  }

  return err;
}

export async function iviraFetch(url, options = {}) {
  const { signal, headers, method, body } = options;

  try {
    return await undiciFetch(url, {
      method,
      headers,
      body,
      signal,
      dispatcher: getDispatcher(),
    });
  } catch (err) {
    throw mapIviraFetchError(err, env.IVIRA_BASE_URL);
  }
}

export default {
  iviraFetch,
  mapIviraFetchError,
};
