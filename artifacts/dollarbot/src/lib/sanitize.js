// Utility: sanitize message payloads and provide a retrying fetch wrapper
const fetch = require('node-fetch');

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function deepRemoveKeys(obj, keys = []) {
  if (Array.isArray(obj)) {
    for (const item of obj) deepRemoveKeys(item, keys);
    return;
  }
  if (!obj || typeof obj !== 'object') return;
  for (const k of Object.keys(obj)) {
    if (keys.includes(k)) {
      delete obj[k];
    } else {
      deepRemoveKeys(obj[k], keys);
    }
  }
}

function sanitizeMessages(messages) {
  const copy = deepClone(messages || []);
  // Remove commonly injected fields that upstream providers reject
  const banned = ['ts', 'id', 'messageTimestamp', 'key', 'participant', '_serialized'];
  deepRemoveKeys(copy, banned);
  return copy;
}

async function retryFetch(url, options = {}, retries = 3, backoff = 400) {
  let lastErr = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      // Retry on 502/503/504
      if ([502, 503, 504].includes(res.status)) {
        lastErr = new Error(`HTTP ${res.status}`);
        await new Promise(r => setTimeout(r, backoff * (attempt + 1)));
        continue;
      }
      return res; // return non-retriable response (like 400)
    } catch (e) {
      lastErr = e;
      // If it's a DNS/transient error, wait and retry
      if (/EAI_AGAIN|ENOTFOUND|getaddrinfo/i.test(String(e))) {
        await new Promise(r => setTimeout(r, backoff * (attempt + 1)));
        continue;
      }
      throw e; // non-transient error
    }
  }
  throw lastErr;
}

module.exports = { sanitizeMessages, retryFetch };
