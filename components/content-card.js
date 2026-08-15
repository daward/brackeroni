import { forwardRef } from "react";

/** Shared shell for recurring content cards. Content stays domain-specific. */
export const ContentCard = forwardRef(function ContentCard(
  {
    as: Component = "div",
    interactive = false,
    selected = false,
    selectedTone = "cyan",
    className = "",
    children,
    ...props
  },
  ref
) {
  const classes = [
    "content-card",
    interactive ? "content-card-interactive" : "",
    selected ? `content-card-selected-${selectedTone}` : "",
    className
  ].filter(Boolean).join(" ");

  return <Component ref={ref} className={classes} {...props}>{children}</Component>;
});
