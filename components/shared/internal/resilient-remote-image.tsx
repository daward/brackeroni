"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import type { BackdropRemoteImageProps, ResilientRemoteImageProps } from "../types";
import styles from "./resilient-remote-image.module.css";

function normalizeRemoteImageUrl(url: string) {
  const normalized = url.trim();

  if (normalized.startsWith("//")) {
    return `https:${normalized}`;
  }

  return normalized;
}

function proxiedImageUrl(url: string) {
  if (!url) {
    return "";
  }

  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

function useResilientImageSource(
  src: string | null | undefined,
  proxyOnError: boolean,
  onError: ResilientRemoteImageProps["onError"]
) {
  const normalizedSrc = normalizeRemoteImageUrl(String(src || ""));
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
    handleError: (event: SyntheticEvent<HTMLImageElement>) => {
      onError?.(event);

      if (proxyOnError && !hasTriedProxy && proxySrc && currentSrc !== proxySrc) {
        setCurrentSrc(proxySrc);
        setHasTriedProxy(true);
      }
    }
  };
}

export function ResilientRemoteImage({
  src,
  onError,
  proxyOnError = false,
  ...props
}: ResilientRemoteImageProps) {
  const { normalizedSrc, currentSrc, handleError } = useResilientImageSource(
    src,
    proxyOnError,
    onError
  );
  const effectiveSrc = currentSrc || normalizedSrc;

  if (!normalizedSrc) {
    return null;
  }

  return (
    <img
      {...props}
      src={effectiveSrc}
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
}: BackdropRemoteImageProps) {
  const { normalizedSrc, currentSrc, handleError } = useResilientImageSource(
    src,
    proxyOnError,
    onError
  );
  const [isUndersized, setIsUndersized] = useState(false);
  const effectiveSrc = currentSrc || normalizedSrc;

  useEffect(() => {
    setIsUndersized(false);
  }, [currentSrc]);

  if (!normalizedSrc) {
    return null;
  }

  return (
    <div className={`${styles.backdrop} ${className}`.trim()}>
      {isUndersized ? (
        <>
          <img
            src={effectiveSrc}
            alt=""
            aria-hidden="true"
            loading={props.loading ?? "lazy"}
            decoding={props.decoding ?? "async"}
            referrerPolicy={props.referrerPolicy ?? "no-referrer"}
            onError={handleError}
            className={`${styles.backdropImage} ${backdropClassName}`.trim()}
          />
          <div className={styles.backdropOverlay} />
        </>
      ) : null}
      {isUndersized ? (
        <div
          className={`${styles.foreground} ${foregroundWrapperClassName}`.trim()}
        >
          <img
            {...props}
            src={effectiveSrc}
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
            className={undersizedImageClassName || styles.containedImage}
          />
        </div>
      ) : (
        <img
          {...props}
          src={effectiveSrc}
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
          className={`${styles.image} ${imageClassName || styles.coverImage}`.trim()}
        />
      )}
    </div>
  );
}
