const API_URL = import.meta.env.VITE_API_URL || "https://vakilo-demo-2.onrender.com/";

interface ApiRequestOptions {
  method?: string;
  token?: string;
  body?: unknown;
}

interface FastAPIValidationError {
  type?: string;
  loc?: Array<string | number>;
  msg?: string;
  input?: unknown;
}

function formatApiError(data: any): string {
  if (!data) {
    return "Request failed.";
  }

  const detail = data.detail;

  // FastAPI validation errors
  if (Array.isArray(detail)) {
    return detail
      .map((error: FastAPIValidationError) => {
        const message = error?.msg || "Invalid value.";

        const location = Array.isArray(error?.loc)
          ? error.loc
              .filter((item) => item !== "body")
              .join(".")
          : "";

        return location
          ? `${location}: ${message}`
          : message;
      })
      .join("\n");
  }

  // Normal FastAPI HTTPException
  if (typeof detail === "string") {
    return detail;
  }

  // detail is an object
  if (typeof detail === "object" && detail !== null) {
    return (
      detail?.msg ||
      detail?.message ||
      JSON.stringify(detail)
    );
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  return "Request failed.";
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    token,
    body,
  } = options;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  /*
   * IMPORTANT:
   * FormData must NOT have Content-Type set manually.
   * The browser automatically adds:
   *
   * multipart/form-data; boundary=...
   *
   * For normal objects, send JSON.
   */
  const isFormData = body instanceof FormData;

  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let requestBody: BodyInit | undefined;

  if (body !== undefined) {
    if (isFormData) {
      // Keep FormData exactly as it is.
      requestBody = body as FormData;
    } else {
      requestBody = JSON.stringify(body);
    }
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: requestBody,
    });
  } catch (error) {
    console.error("API connection error:", error);

    throw new Error(
      "Unable to connect to the server. Make sure the FastAPI backend is running."
    );
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;

    try {
      const data = await response.json();
      message = formatApiError(data);
    } catch {
      try {
        const text = await response.text();

        if (text) {
          message = text;
        }
      } catch {
        // Keep default message
      }
    }

    throw new Error(message);
  }

  /*
   * Some successful endpoints may return
   * an empty response.
   */
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
