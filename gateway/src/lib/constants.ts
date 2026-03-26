/**
 * Canonical Haath Agent Gateway listen port.
 * OpenClaw commonly uses 18789 for its gateway; Haath uses 28657 to avoid collisions.
 */
export const HAATH_GATEWAY_PORT = 28657;

/** ASMP server is mounted under this path on the same HTTP server as the dashboard. */
export const HAATH_ASMP_BASE_PATH = "/asmp";

export const HAATH_CONFIG_PATH = "~/.haath/haath.json";
