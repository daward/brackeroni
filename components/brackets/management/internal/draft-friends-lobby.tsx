"use client";

import type { DraftLobbyProps } from "../types";
import styles from "./draft.module.css";

export function DraftFriendsLobby({ activeShareLink, invitees, isParallelParent, isCopyPending, onCopyShareLink }: DraftLobbyProps) {
  return (
    <section className={`${styles.section} ${styles.surface}`}>
      <div className={styles.header}>
        <div>
          <p className={styles.lobbyHeading}>Friends Lobby</p>
          <p className={styles.helper}>{activeShareLink ? "Share this bracket with friends before it starts." : "Preparing invite link..."}</p>
        </div>
        <button type="button" onClick={onCopyShareLink} disabled={isCopyPending} className="ui-button ui-button-accent">
          {activeShareLink ? "Copy Link" : "Preparing"}
        </button>
      </div>
      <div className={styles.lobbyContent}>
        {invitees.length === 0 ? (
          <p className={styles.lobbyEmpty}>No one is waiting yet.</p>
        ) : (
          <>
            <p className={styles.lobbySubheading}>{isParallelParent ? "Participants" : "Waiting On Start"}</p>
            <div className={styles.inviteList}>
              {invitees.map((invite) => (
                <div key={invite.id} className={styles.inviteRow}>
                  <div className={styles.inviteIdentity}>
                    <p className={styles.inviteName}>{invite.name || invite.email}</p>
                    {invite.email ? <p className={styles.inviteEmail}>{invite.email}</p> : null}
                  </div>
                  <span className={styles.inviteStatus}>{invite.status}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
