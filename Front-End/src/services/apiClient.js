import NProgress from "nprogress";
import { broadcastDataChange } from "../utils/syncManager";

// Configure NProgress (optional, e.g. don't show spinner)
NProgress.configure({ showSpinner: false });

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "/api/v1"
).replace(/\/+$/, "");

export async function apiRequest(endpoint, options = {}) {
  const token = sessionStorage.getItem("hrms_token");

  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const url = `${API_BASE_URL}${normalizedEndpoint}`;

  const headers = {
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(token
      ? { Authorization: `Bearer ${token}` }
      : {}),
    ...(options.headers || {}),
  };

  let response;

  NProgress.start();

  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    NProgress.done();
    throw new Error(
      `Cannot reach HRMS API at ${url}. Check that the backend is running and the frontend API URL is correct.`
    );
  }

  const contentType = response.headers.get("content-type") || "";

  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem("hrms_token");
    }

    NProgress.done();
    throw new Error(
      typeof data === "object" && data?.message
        ? data.message
        : `API request failed with status ${response.status}`
    );
  }

  // If a data-mutating call succeeded, broadcast an update event so all views sync
  const method = (options.method || "GET").toUpperCase();
  if (method !== "GET") {
    broadcastDataChange(normalizedEndpoint, { method, timestamp: Date.now() });
  }

  NProgress.done();
  return data;
}

export async function apiDownload(endpoint, filename = "download") {
  const token = sessionStorage.getItem("hrms_token");

  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const url = `${API_BASE_URL}${normalizedEndpoint}`;

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  NProgress.start();

  const response = await fetch(url, { headers });

  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem("hrms_token");
    }
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      NProgress.done();
      throw new Error(data?.message || `Download failed with status ${response.status}`);
    }
    NProgress.done();
    throw new Error(`Download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
  NProgress.done();
}
