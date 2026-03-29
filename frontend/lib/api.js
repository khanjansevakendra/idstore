const LOCAL_API_BASE_URL = "http://localhost:4000";
const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
  /\/+$/,
  ""
);
const isDevelopment = process.env.NODE_ENV !== "production";

export const API_BASE_URL =
  configuredApiBaseUrl || (isDevelopment ? LOCAL_API_BASE_URL : "");
export const HAS_API_BASE_URL = Boolean(API_BASE_URL);

export function getMissingApiBaseUrlMessage() {
  return "Backend URL configured nahi hai. GitHub repo variable NEXT_PUBLIC_API_BASE_URL set karo aur website ko redeploy karo.";
}

export function getApiErrorMessage(error, fallbackMessage) {
  if (error?.message && error.message !== "Failed to fetch") {
    return error.message;
  }

  if (!HAS_API_BASE_URL) {
    return getMissingApiBaseUrlMessage();
  }

  return (
    fallbackMessage ||
    "Backend se connection nahi ho pa raha. NEXT_PUBLIC_API_BASE_URL aur deployed backend ko check karo."
  );
}
