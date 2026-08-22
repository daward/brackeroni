import styles from "./candidate-tag-drawer.module.css";
import { CandidateTagManagementSection } from "./candidate-tag-management-section";
import { SideDrawer, SideDrawerBody } from "@/components/shared";
import type { CandidateTagManagement } from "../types";

type TagState = { isOpen: boolean; sortedTags: [string, number][]; activeTagFilter: string; lowValueThreshold: string; onClose: () => void; onActiveFilterChange: (tag: string) => void; onLowValueThresholdChange: (threshold: string) => void };
type Props = { tags: TagState; management: Omit<CandidateTagManagement, "showControl"> & { readOnly: boolean } };

export function CandidateTagDrawer({ tags, management }: Props) {
  const {
    isOpen,
    sortedTags,
    activeTagFilter,
    lowValueThreshold,
    onClose,
    onActiveFilterChange,
    onLowValueThresholdChange
  } = tags;
  const { readOnly } = management;
  if (!isOpen) {
    return null;
  }

  return (
    <SideDrawer
      size="narrow"
      title="Pool Tags"
      description="Filter the pool or remove a tag everywhere."
      onClose={onClose}
    >
      <SideDrawerBody>
          {sortedTags.length === 0 ? (
            <p className="ui-copy">No tags in this pool yet.</p>
          ) : (
            <div className={styles.sections}>
              <section className={styles.section}>
                <p className={`ui-section-kicker ${styles.sectionHeading}`}>Filter</p>
                <div className={styles.tagChoices}>
                  <button
                    type="button"
                    onClick={() => onActiveFilterChange("")}
                    className={`ui-button ui-button-muted ui-button-compact ${!activeTagFilter ? styles.filterButtonActive : ""}`}
                  >
                    All Tags
                  </button>
                  {sortedTags.map(([tag, count]) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onActiveFilterChange(activeTagFilter === tag ? "" : tag)}
                      className={`ui-button ui-button-muted ui-button-compact ${activeTagFilter === tag ? styles.filterButtonSelected : ""}`}
                    >
                      {tag} ({count})
                    </button>
                  ))}
                </div>
              </section>
              {!readOnly ? <CandidateTagManagementSection tags={{ sortedTags, lowValueThreshold, onLowValueThresholdChange }} management={management} /> : null}
            </div>
          )}
      </SideDrawerBody>
    </SideDrawer>
  );
}
