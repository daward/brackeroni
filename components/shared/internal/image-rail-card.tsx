import { ContentCard } from "./content-card";
import { ResilientRemoteImage } from "./resilient-remote-image";
import type { ElementType, ReactElement } from "react";
import type { ImageRailCardProps } from "../types";

type ImageRailCardComponent = <Element extends ElementType = "div">(
  props: ImageRailCardProps<Element>
) => ReactElement | null;

function ImageRailCardImplementation({
  as = "div",
  imageUrl,
  imageAlt = "",
  className = "",
  railClassName = "",
  children,
  ...props
}: ImageRailCardProps) {
  return (
    <ContentCard as={as} className={`image-rail-card ${className}`.trim()} {...props}>
      <ResilientRemoteImage
        src={imageUrl}
        alt={imageAlt}
        className="image-rail-card-image"
        proxyOnError
      />
      <div className={`image-rail-card-rail ${railClassName}`.trim()}>{children}</div>
    </ContentCard>
  );
}

export const ImageRailCard = ImageRailCardImplementation as ImageRailCardComponent;
