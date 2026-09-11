"use strict";

function normalizeCustomerSession(value) {
  if (!value || typeof value !== "object") return null;
  const accessToken = value.access_token || value.accessToken;
  const refreshToken = value.refresh_token || value.refreshToken;
  if (typeof accessToken !== "string" || !accessToken || typeof refreshToken !== "string" || !refreshToken) return null;
  const expiresIn = Number(value.expires_in ?? value.expiresIn);
  const expiresAt = value.expires_at || value.expiresAt || (Number.isFinite(expiresIn) && expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : undefined);
  return {
    customer_id: value.customer_id || value.customerId,
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: value.token_type || value.tokenType || "Bearer",
    ...(Number.isFinite(expiresIn) && expiresIn > 0 ? { expires_in: expiresIn } : {}),
    ...(typeof expiresAt === "string" && expiresAt ? { expires_at: expiresAt } : {})
  };
}

function isCustomerSession(value) {
  return Boolean(normalizeCustomerSession(value));
}

module.exports = { normalizeCustomerSession, isCustomerSession };
