import type { ReactNode } from "react";
import { ResilientRemoteImage } from "@/components/shared";

type FeaturedCandidateMediaProps = {
  name: string;
  imageUrl?: string | null;
  wrapperClassName: string;
  backdropClassName: string;
  glowClassName: string;
  imageClassName: string;
  fallbackClassName: string;
  children: ReactNode;
};

export function FeaturedCandidateMedia({
  name,
  imageUrl,
  wrapperClassName,
  backdropClassName,
  glowClassName,
  imageClassName,
  fallbackClassName,
  children,
}: FeaturedCandidateMediaProps) {
  return (
    <div className={wrapperClassName}>
      {imageUrl ? (
        <>
          <ResilientRemoteImage src={imageUrl} alt="" aria-hidden="true" className={backdropClassName} />
          <div className={glowClassName} />
          <ResilientRemoteImage src={imageUrl} alt={name} className={imageClassName} />
        </>
      ) : (
        <div className={fallbackClassName} />
      )}
      {children}
    </div>
  );
}
