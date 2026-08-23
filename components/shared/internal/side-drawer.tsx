import styles from "./side-drawer.module.css";
import type { SideDrawerBodyProps, SideDrawerProps } from "../types";

const drawerSizeClassName = {
  narrow: styles.drawerNarrow,
  wide: styles.drawerWide,
  xwide: styles.drawerXWide,
};

export function SideDrawer({ size = "wide", title, description = "", onClose, children }: SideDrawerProps) {
  return (
    <div className={styles.overlay}>
      <button type="button" aria-label={`Close ${title}`} onClick={onClose} className={styles.backdrop} />
      <aside className={`${styles.drawer} ${drawerSizeClassName[size]}`} aria-modal="true" role="dialog" aria-label={title}>
        <header className={styles.header}>
          <div>
            <p className={`ui-section-kicker ${styles.title}`}>{title}</p>
            {description ? <p className={`ui-copy ${styles.description}`}>{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="ui-button ui-button-muted">
            Close
          </button>
        </header>
        {children}
      </aside>
    </div>
  );
}

export function SideDrawerBody({ children }: SideDrawerBodyProps) {
  return <div className={`ui-scroll-subtle ${styles.body}`}>{children}</div>;
}
