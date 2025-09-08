import Cookies from "js-cookie";

async function crudRequest(endpoint, method, body) {
  try {
    const token = Cookies.get("token");
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      ...(body && { body: JSON.stringify(body) }),
    };

    const response = await fetch(endpoint, options);

    let data;
    const contentType = response.headers.get("Content-Type") || "";

    if (contentType.includes("application/json")) {
      data = await response.json().catch(() => ({}));
    } else {
      data = { message: await response.text() };
    }

    if (!response.ok || data.error) {
      throw {
        status: response.status,
        message: data?.message || response.statusText,
      };
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export const crudService = {
  get: (endpoint) => crudRequest(endpoint, "GET"),
  post: (endpoint, data) => crudRequest(endpoint, "POST", data),
  put: (endpoint, data) => crudRequest(endpoint, "PUT", data),
  patch: (endpoint, data) => crudRequest(endpoint, "PATCH", data),
  delete: (endpoint) => crudRequest(endpoint, "DELETE"),
  request: (options) =>
    crudRequest(options.endpoint, options.method, options.body),
};
