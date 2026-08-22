import type { ElementType, ReactElement } from "react";
import type { CompactRailHeaderProps } from "../types";

type CompactRailHeaderComponent = <Element extends ElementType = "div">(
  props: CompactRailHeaderProps<Element>
) => ReactElement | null;

function CompactRailHeaderImplementation({
  as: Element = "div",
  className = "",
  title,
  kicker = null,
  action = null,
  titleClassName = "",
  ...props
}: CompactRailHeaderProps<ElementType>) {
  const isButton = Element === "button";
  const CopyElement = isButton ? "span" : "div";
  const TitleElement = isButton ? "span" : "h2";

  return (
    <Element className={`compact-rail-header ${className}`.trim()} {...props}>
      <CopyElement className="compact-rail-header-copy">
        {kicker ? <span className="ui-section-kicker compact-rail-header-kicker">{kicker}</span> : null}
        <TitleElement
          className={`compact-rail-header-title display-face ${titleClassName}`.trim()}
          {...(isButton ? { role: "heading", "aria-level": 2 } : {})}
        >
          {title}
        </TitleElement>
      </CopyElement>
      {action ? <span className="compact-rail-header-action">{action}</span> : null}
    </Element>
  );
}

export const CompactRailHeader = CompactRailHeaderImplementation as CompactRailHeaderComponent;
