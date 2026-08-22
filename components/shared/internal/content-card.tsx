import { createElement, forwardRef, type ElementType, type ForwardedRef, type ReactElement } from "react";
import type { ContentCardOptions, ContentCardProps, PolymorphicRefProps } from "../types";

type ContentCardComponent = <Element extends ElementType = "div">(
  props: ContentCardProps<Element> & PolymorphicRefProps<Element>
) => ReactElement | null;

/** Shared shell for recurring content cards. Content stays domain-specific. */
function ContentCardComponent(
  {
    as: Component = "div",
    interactive = false,
    selected = false,
    selectedTone = "cyan",
    className = "",
    children,
    ...props
  }: ContentCardProps,
  ref: ForwardedRef<HTMLElement>
) {
  const classes = [
    "content-card",
    interactive ? "content-card-interactive" : "",
    selected ? `content-card-selected-${selectedTone}` : "",
    className
  ].filter(Boolean).join(" ");

  return createElement(Component, { ...props, ref, className: classes }, children);
}

export const ContentCard = forwardRef<HTMLElement, ContentCardOptions>(ContentCardComponent) as ContentCardComponent;
