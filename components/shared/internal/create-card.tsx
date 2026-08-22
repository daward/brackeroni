import type { ElementType, ReactElement } from "react";
import type { CreateCardProps } from "../types";

type CreateCardComponent = <Element extends ElementType = "button">(
  props: CreateCardProps<Element>
) => ReactElement | null;

function CreateCardImplementation({ as: Component = "button", tone = "primary", icon, title, description, className = "", children = null, ...props }: CreateCardProps) {
  return (
    <Component className={`workspace-create-card workspace-create-card-${tone} ${className}`.trim()} {...props}>
      <span className="workspace-create-card-icon display-face">{icon}</span>
      <span>
        <span className="workspace-create-card-title display-face">{title}</span>
        <span className="workspace-create-card-copy ui-copy">{description}</span>
      </span>
      {children}
    </Component>
  );
}

export const CreateCard = CreateCardImplementation as CreateCardComponent;
