export function SectionCard({ title, action, children, actionAlign = "right", className = "" }: SectionCardProps) {
  const headerAlignment =
    title && action ? styles.headerSplit : actionAlign === "left" ? styles.headerStart : styles.headerEnd;

  return (
    <section className={`${styles.card} ${className}`.trim()}>
      {title || action ? (
        <div className={`${styles.header} ${headerAlignment}`}>
          {title ? (
            <h2 className={`${styles.title} display-face`}>
              {title}
            </h2>
          ) : null}
          {action ? <div>{action}</div> : null}
        </div>
      ) : null}
      <div>{children}</div>
    </section>
  );
}
import type { SectionCardProps } from "../types";
import styles from "./section-card.module.css";
