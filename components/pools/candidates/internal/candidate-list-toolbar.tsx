import styles from "./candidate-list-toolbar.module.css";
type Props = { list: { heading?: string | null; activeFilter: string }; tags: { enabled: boolean; count: number; readOnly: boolean; onOpen: () => void } };

export function CandidateListToolbar({ list, tags }: Props) {
  const showToolbar = Boolean(list.heading || list.activeFilter || tags.enabled);

  if (!showToolbar) {
    return null;
  }

  return (
    <div className={styles.toolbar}>
      <div>
        {list.heading ? (
          <p className={`display-face ${styles.heading}`}>
            {list.activeFilter ? `${list.heading} · ${list.activeFilter}` : list.heading}
          </p>
        ) : null}
        {list.activeFilter ? <p className={`ui-meta ${styles.filterStatus}`}>Filtered by tag</p> : null}
      </div>
      {tags.enabled && tags.count > 0 ? (
        <button type="button" onClick={tags.onOpen} className="ui-button ui-button-muted">
          {tags.readOnly ? "View Tags" : "Manage Tags"}
        </button>
      ) : null}
    </div>
  );
}
