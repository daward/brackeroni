export function resolvePreferredOrigin({ configuredOrigin, forwardedProto, forwardedHost, host }) {
  const requestHost = forwardedHost || host || "";
  const requestProtocol = forwardedProto || (requestHost.includes("localhost") ? "http" : "https");

  if (requestHost) {
    if (!configuredOrigin) {
      return `${requestProtocol}://${requestHost}`;
    }

    try {
      const configuredUrl = new URL(configuredOrigin);
      const configuredHost = configuredUrl.host;
      const configuredIsLocalhost =
        configuredUrl.hostname === "localhost" || configuredUrl.hostname === "127.0.0.1";
      const requestIsLocalhost =
        requestHost.startsWith("localhost") || requestHost.startsWith("127.0.0.1");

      if (configuredHost === requestHost) {
        return configuredOrigin;
      }

      if (configuredIsLocalhost && !requestIsLocalhost) {
        return `${requestProtocol}://${requestHost}`;
      }

      return configuredOrigin;
    } catch {
      return `${requestProtocol}://${requestHost}`;
    }
  }

  return configuredOrigin || "https://brackeroni.com";
}
