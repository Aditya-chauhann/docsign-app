const BASE_URL = "http://localhost:8000";

export async function apiFetch(path, options = {}, token = null) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) throw new Error(data.detail || "API error");
  return data;
}

export async function apiUpload(path, formData, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,          // no Content-Type header — browser sets multipart boundary
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Upload error");
  return data;
}
