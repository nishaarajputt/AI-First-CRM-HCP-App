const BASE = import.meta.env.VITE_API_BASE || "";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || body.message || detail;
    } catch (_) {
      if (res.status === 500) {
        detail =
          "Cannot reach the backend API. Make sure uvicorn is running on port 8000 " +
          "(cd backend && uvicorn app.main:app --reload --port 8000).";
      }
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  health: () => request("/api/health"),
  sendChat: (payload) =>
    request("/api/chat", { method: "POST", body: JSON.stringify(payload) }),
  createInteraction: (payload) =>
    request("/api/interactions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listInteractions: () => request("/api/interactions"),
  scoreCompliance: (payload) =>
    request("/api/compliance/score", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
