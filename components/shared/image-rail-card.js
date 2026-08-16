import { ContentCard } from "@/components/shared/content-card";

export function ImageRailCard({
  as = "div",
  imageUrl,
  imageAlt = "",
  className = "",
  railClassName = "",
  children,
  ...props
}) {
  return (
    <ContentCard as={as} className={`image-rail-card ${className}`.trim()} {...props}>
      {imageUrl ? <img src={imageUrl} alt={imageAlt} className="image-rail-card-image" /> : null}
      <div className={`image-rail-card-rail ${railClassName}`.trim()}>{children}</div>
    </ContentCard>
  );
}
