"use client";

import { useEffect, useState } from "react";

function proxiedImageUrl(url) {
  if (!url) {
    return "";
  }

  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

function useResilientImageSource(src, proxyOnError, onError) {
  const normalizedSrc = String(src || "").trim();
  const proxySrc = proxiedImageUrl(normalizedSrc);
  const [currentSrc, setCurrentSrc] = useState(normalizedSrc);
  const [hasTriedProxy, setHasTriedProxy] = useState(false);

  useEffect(() => {
    setCurrentSrc(normalizedSrc);
    setHasTriedProxy(false);
  }, [normalizedSrc]);

  if (!normalizedSrc) {
    return {
      normalizedSrc,
      currentSrc,
      handleError: () => {}
    };
  }

  return {
    normalizedSrc,
    currentSrc,
    handleError: (event) => {
      onError?.(event);

      if (proxyOnError && !hasTriedProxy && proxySrc && currentSrc !== proxySrc) {
        setCurrentSrc(proxySrc);
        setHasTriedProxy(true);
      }
    }
  };
}

export function ResilientRemoteImage({ src, onError, proxyOnError = false, ...props }) {
  const { normalizedSrc, currentSrc, handleError } = useResilientImageSource(
    src,
    proxyOnError,
    onError
  );

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
      onError={handleError}
    />
  );
}

export function BackdropRemoteImage({
  src,
  alt,
  className = "",
  imageClassName = "",
  undersizedImageClassName = "",
  backdropClassName = "",
  foregroundWrapperClassName = "",
  minimumSourceWidth = 96,
  minimumSourceHeight = 96,
  onError,
  proxyOnError = false,
  ...props
}) {
  const { normalizedSrc, currentSrc, handleError } = useResilientImageSource(
    src,
    proxyOnError,
    onError
  );
  const [isUndersized, setIsUndersized] = useState(false);

  useEffect(() => {
    setIsUndersized(false);
  }, [currentSrc]);

  if (!normalizedSrc) {
    return null;
  }

  return (
    <div className={`relative overflow-hidden bg-[var(--panel-3)] ${className}`}>
      {isUndersized ? (
        <>
          <img
            src={currentSrc}
            alt=""
            aria-hidden="true"
            loading={props.loading ?? "lazy"}
            decoding={props.decoding ?? "async"}
            referrerPolicy={props.referrerPolicy ?? "no-referrer"}
            onError={handleError}
            className={`absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-xl saturate-125 ${backdropClassName}`}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),rgba(15,15,15,0.18)_48%,rgba(10,10,10,0.88)_100%)]" />
        </>
      ) : null}
      {isUndersized ? (
        <div
          className={`relative z-10 flex h-full w-full items-center justify-center ${foregroundWrapperClassName}`}
        >
          <img
            {...props}
            src={currentSrc}
            alt={alt}
            loading={props.loading ?? "lazy"}
            decoding={props.decoding ?? "async"}
            referrerPolicy={props.referrerPolicy ?? "no-referrer"}
            onError={handleError}
            onLoad={(event) => {
              props.onLoad?.(event);
              const { naturalWidth, naturalHeight } = event.currentTarget;
              setIsUndersized(
                naturalWidth > 0 &&
                  naturalHeight > 0 &&
                  (naturalWidth < minimumSourceWidth || naturalHeight < minimumSourceHeight)
              );
            }}
            className={undersizedImageClassName || "max-h-full max-w-full object-contain p-2"}
          />
        </div>
      ) : (
        <img
          {...props}
          src={currentSrc}
          alt={alt}
          loading={props.loading ?? "lazy"}
          decoding={props.decoding ?? "async"}
          referrerPolicy={props.referrerPolicy ?? "no-referrer"}
          onError={handleError}
          onLoad={(event) => {
            props.onLoad?.(event);
            const { naturalWidth, naturalHeight } = event.currentTarget;
            setIsUndersized(
              naturalWidth > 0 &&
                naturalHeight > 0 &&
                (naturalWidth < minimumSourceWidth || naturalHeight < minimumSourceHeight)
            );
          }}
          className={`relative z-10 h-full w-full ${imageClassName || "object-cover"}`}
        />
      )}
    </div>
  );
}
