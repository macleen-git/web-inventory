const configuredApiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
export const API_BASE_URL = configuredApiUrl.replace(/\/+$/, "");
export const API_URL = (path = "") => {
  const normalizedPath = String(path).replace(/^\/+/, "");
  return normalizedPath ? `${API_BASE_URL}/${normalizedPath}` : API_BASE_URL;
};
