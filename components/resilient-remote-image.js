"use client";

import { useEffect, useState } from "react";

function proxiedImageUrl(url) {
  if (!url) {
    return "";
  }

  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

export function ResilientRemoteImage({ src, onError, ...props }) {
  const normalizedSrc = String(src || "").trim();
  const proxySrc = proxiedImageUrl(normalizedSrc);
  const [currentSrc, setCurrentSrc] = useState(normalizedSrc);
  const [hasTriedProxy, setHasTriedProxy] = useState(false);

  useEffect(() => {
    setCurrentSrc(normalizedSrc);
    setHasTriedProxy(false);
  }, [normalizedSrc]);

  if (!normalizedSrc) {
    return null;
  }

  return (
    <img
      {...props}
      src={currentSrc}
      loading={props.loading ?? "lazy"}
      decoding={props.decoding ?? "async"}
      referrerPolicy={props.referrerPolicy ?? "no-referrer"}
      onError={(event) => {
        onError?.(event);

        if (!hasTriedProxy && proxySrc && currentSrc !== proxySrc) {
          setCurrentSrc(proxySrc);
          setHasTriedProxy(true);
        }
      }}
    />
  );
}
