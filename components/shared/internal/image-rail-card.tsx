import { ContentCard } from "./content-card";
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
      {imageUrl ? <img src={imageUrl} alt={imageAlt} className="image-rail-card-image" /> : null}
      <div className={`image-rail-card-rail ${railClassName}`.trim()}>{children}</div>
    </ContentCard>
  );
}

export const ImageRailCard = ImageRailCardImplementation as ImageRailCardComponent;
