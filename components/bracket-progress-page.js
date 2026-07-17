"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { BackdropRemoteImage } from "@/components/resilient-remote-image";
import { revealTournamentRound } from "@/lib/client-api/create-workspace";
import {
  formatResultModeLabel,
  usesOpenEndedRankingMode,
  usesSwissResultMode
} from "@/lib/bracket-modes";

function formatRoundTitle(round, tournament) {
  if (usesOpenEndedRankingMode(tournament.resultMode) && round.rankingTargetRank) {
    return `Ranking ${round.rankingTargetRank}: Round ${round.rankingRoundNumber}`;
  }

  if (usesSwissResultMode(tournament.resultMode)) {
    return `Swiss Round ${round.roundNumber}`;
  }

  return `Round ${round.roundNumber}`;
}

function getEntryVoteLeaders(matches) {
  const votesByEntry = new Map();

  for (const match of matches) {
    if (match.leftEntryId) {
      const current = votesByEntry.get(match.leftEntryId) || {
        entryId: match.leftEntryId,
        name: match.leftName,
        seed: match.leftSeed,
        imageUrl: match.leftImageUrl,
        votes: 0
      };
      current.votes += match.leftVoteCount ?? 0;
      votesByEntry.set(match.leftEntryId, current);
    }

    if (match.rightEntryId) {
      const current = votesByEntry.get(match.rightEntryId) || {
        entryId: match.rightEntryId,
        name: match.rightName,
        seed: match.rightSeed,
        imageUrl: match.rightImageUrl,
        votes: 0
      };
      current.votes += match.rightVoteCount ?? 0;
      votesByEntry.set(match.rightEntryId, current);
    }
  }

  return [...votesByEntry.values()].sort((left, right) => right.votes - left.votes);
}

function getMatchSummary(match) {
  const leftVotes = match.leftVoteCount ?? 0;
  const rightVotes = match.rightVoteCount ?? 0;
  const totalVotes = leftVotes + rightVotes;
  const winnerIsLeft = match.winnerEntryId === match.leftEntryId;
  const winnerName = winnerIsLeft ? match.leftName : match.rightName;
  const loserName = winnerIsLeft ? match.rightName : match.leftName;
  const winnerSeed = winnerIsLeft ? match.leftSeed : match.rightSeed;
  const loserSeed = winnerIsLeft ? match.rightSeed : match.leftSeed;
  const winnerImageUrl = winnerIsLeft ? match.leftImageUrl : match.rightImageUrl;
  const loserImageUrl = winnerIsLeft ? match.rightImageUrl : match.leftImageUrl;
  const winnerVotes = winnerIsLeft ? leftVotes : rightVotes;
  const loserVotes = winnerIsLeft ? rightVotes : leftVotes;

  return {
    ...match,
    totalVotes,
    margin: Math.abs(leftVotes - rightVotes),
    winnerName,
    loserName,
    winnerSeed,
    loserSeed,
    winnerImageUrl,
    loserImageUrl,
    winnerVotes,
    loserVotes,
    winnerPercent: totalVotes > 0 ? winnerVotes / totalVotes : 0,
    upsetDelta:
      winnerSeed && loserSeed && winnerSeed > loserSeed ? winnerSeed - loserSeed : 0
  };
}

function isByeMatch(match) {
  return Boolean(match.winnerEntryId && (!match.leftEntryId || !match.rightEntryId));
}

function getSwissEntryStatsThroughRound(matches, roundNumber) {
  const statsByEntryId = new Map();

  function ensureEntry(entryId, name, seed) {
    if (!entryId) {
      return null;
    }

    const current = statsByEntryId.get(entryId) || {
      entryId,
      name,
      seed,
      points: 0,
      wins: 0,
      losses: 0,
      byes: 0
    };
    statsByEntryId.set(entryId, current);
    return current;
  }

  for (const match of matches) {
    if (!match.winnerEntryId || match.roundNumber > roundNumber) {
      continue;
    }

    const left = ensureEntry(match.leftEntryId, match.leftName, match.leftSeed);
    const right = ensureEntry(match.rightEntryId, match.rightName, match.rightSeed);
    const winner =
      match.winnerEntryId === match.leftEntryId
        ? left
        : match.winnerEntryId === match.rightEntryId
          ? right
          : null;
    const loser = winner === left ? right : winner === right ? left : null;

    if (!winner) {
      continue;
    }

    winner.points += 1;

    if (isByeMatch(match)) {
      winner.byes += 1;
    } else {
      winner.wins += 1;

      if (loser) {
        loser.losses += 1;
      }
    }
  }

  return statsByEntryId;
}

function getSwissPointsEarned(match, entryId) {
  return match.winnerEntryId === entryId ? 1 : 0;
}

function getRoundStats(matches) {
  const visibleMatches = matches.filter((match) => match.leftEntryId && match.rightEntryId);
  const resolvedMatches = visibleMatches
    .filter((match) => match.winnerEntryId)
    .map(getMatchSummary);
  const totalVotes = visibleMatches.reduce(
    (sum, match) => sum + (match.leftVoteCount ?? 0) + (match.rightVoteCount ?? 0),
    0
  );
  const voteLeaders = getEntryVoteLeaders(visibleMatches).filter((leader) => leader.votes > 0);
  const closestMatches = [...resolvedMatches]
    .filter((match) => match.totalVotes > 0)
    .sort((left, right) => left.margin - right.margin);
  const biggestBlowouts = [...resolvedMatches]
    .filter((match) => match.totalVotes > 0)
    .sort((left, right) => right.winnerPercent - left.winnerPercent);
  const biggestUpsets = [...resolvedMatches]
    .filter((match) => match.upsetDelta > 0)
    .sort((left, right) => right.upsetDelta - left.upsetDelta);

  return {
    totalVotes,
    voteLeader: voteLeaders[0] || null,
    voteLeaderTieCount: countTies(voteLeaders, "votes"),
    closestMatch: closestMatches[0] || null,
    closestMatchTieCount: countTies(closestMatches, "margin"),
    biggestBlowout: biggestBlowouts[0] || null,
    biggestBlowoutTieCount: countTies(biggestBlowouts, "winnerPercent"),
    biggestUpset: biggestUpsets[0] || null,
    biggestUpsetTieCount: countTies(biggestUpsets, "upsetDelta"),
    winners: resolvedMatches
  };
}

function countTies(items, key) {
  if (items.length <= 1) {
    return 0;
  }

  const topValue = items[0][key];
  return items.filter((item, index) => index > 0 && item[key] === topValue).length;
}

function formatTieSuffix(tieCount) {
  return tieCount > 0 ? `and ${tieCount} other${tieCount === 1 ? "" : "s"}` : "";
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function buildCreatorPrompt({ tournament, round, stats }) {
  const bracketUrl =
    typeof window === "undefined"
      ? `/results/${tournament.id}/progress`
      : `${window.location.origin}/results/${tournament.id}/progress`;
  const lines = [
    `${formatRoundTitle(round, tournament)} is in the books for ${tournament.title}.`,
    stats.biggestUpset
      ? `Biggest upset: ${stats.biggestUpset.winnerName} knocked out ${stats.biggestUpset.loserName}.`
      : null,
    stats.closestMatch
      ? `Closest call: ${stats.closestMatch.winnerName} over ${stats.closestMatch.loserName}, ${stats.closestMatch.winnerVotes}-${stats.closestMatch.loserVotes}.`
      : null,
    `Follow the bracket here: ${bracketUrl}`,
    "After you vote in the next round, come back here and tell us who you're rooting for."
  ].filter(Boolean);

  return lines.join("\n\n");
}

function buildShareCardTitle(round, tournament, isFinalResults) {
  return `${isFinalResults ? "Final Results" : formatRoundTitle(round, tournament)} Recap`;
}

function getShareCardItems(stats) {
  return [
    {
      label: "Most Votes",
      value: stats.voteLeader?.name || "No votes yet",
      detail: stats.voteLeader ? `${stats.voteLeader.votes} votes` : "",
      imageUrl: stats.voteLeader?.imageUrl || null
    },
    {
      label: "Closest Match",
      value: stats.closestMatch?.winnerName || "No closed match yet",
      detail: stats.closestMatch
        ? `Beat ${stats.closestMatch.loserName} by ${stats.closestMatch.margin}`
        : "",
      imageUrl: stats.closestMatch?.winnerImageUrl || null
    },
    {
      label: "Biggest Blowout",
      value: stats.biggestBlowout?.winnerName || "No closed match yet",
      detail: stats.biggestBlowout
        ? `${formatPercent(stats.biggestBlowout.winnerPercent)} over ${stats.biggestBlowout.loserName}`
        : "",
      imageUrl: stats.biggestBlowout?.winnerImageUrl || null
    },
    {
      label: "Biggest Upset",
      value: stats.biggestUpset?.winnerName || "No seed upset",
      detail: stats.biggestUpset
        ? `Seed ${stats.biggestUpset.winnerSeed} beat seed ${stats.biggestUpset.loserSeed}`
        : "",
      imageUrl: stats.biggestUpset?.winnerImageUrl || null
    }
  ];
}

function escapeSvgText(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeSvgAttribute(value) {
  return escapeSvgText(value).replaceAll('"', "&quot;");
}

function wrapSvgText(value, maxLength) {
  const words = String(value || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 3);
}

function buildShareCardSvg({ tournament, round, stats, isFinalResults }) {
  const items = getShareCardItems(stats);
  const titleLines = wrapSvgText(tournament.title, 34);
  const cardTitle = buildShareCardTitle(round, tournament, isFinalResults);
  const itemSvg = items
    .map((item, index) => {
      const x = 64 + (index % 2) * 536;
      const y = 300 + Math.floor(index / 2) * 170;
      const stroke = index % 2 === 0 ? "#34d3c4" : "#ffd84d";
      const valueLines = wrapSvgText(item.value, 24);
      const imageSvg = item.imageUrl
        ? `<image href="${escapeSvgAttribute(item.imageUrl)}" x="${x + 24}" y="${y + 48}" width="72" height="72" preserveAspectRatio="xMidYMid slice"/>`
        : "";
      const textX = item.imageUrl ? x + 116 : x + 24;

      return `
        <rect x="${x}" y="${y}" width="472" height="132" fill="none" stroke="${stroke}" stroke-width="3"/>
        <text x="${x + 24}" y="${y + 36}" fill="#34d3c4" font-size="18" font-family="Georgia, serif" font-weight="700" letter-spacing="4">${escapeSvgText(item.label.toUpperCase())}</text>
        ${imageSvg}
        ${valueLines
          .map(
            (line, lineIndex) =>
              `<text x="${textX}" y="${y + 72 + lineIndex * 26}" fill="#f6f2e8" font-size="25" font-family="Arial Narrow, Arial, sans-serif" font-weight="900">${escapeSvgText(line)}</text>`
          )
          .join("")}
        <text x="${textX}" y="${y + 114}" fill="#b7b0a0" font-size="17" font-family="Georgia, serif">${escapeSvgText(item.detail)}</text>
      `;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
    <rect width="1200" height="675" fill="#242424"/>
    <rect x="24" y="24" width="1152" height="627" fill="none" stroke="#565048" stroke-width="2"/>
    <text x="64" y="86" fill="#f6f2e8" font-size="42" font-family="Arial Narrow, Arial, sans-serif" font-weight="900" letter-spacing="2">BRACKERONI</text>
    <text x="64" y="148" fill="#ffd84d" font-size="34" font-family="Arial Narrow, Arial, sans-serif" font-weight="900">${escapeSvgText(cardTitle)}</text>
    ${titleLines
      .map(
        (line, index) =>
          `<text x="64" y="${236 + index * 42}" fill="#f6f2e8" font-size="40" font-family="Arial Narrow, Arial, sans-serif" font-weight="900">${escapeSvgText(line)}</text>`
      )
      .join("")}
    ${itemSvg}
    <text x="64" y="625" fill="#b7b0a0" font-size="20" font-family="Georgia, serif">Vote, then come back and tell us who you're rooting for.</text>
  </svg>`;
}

function downloadTextFile({ filename, text, type }) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function RoundRevealControls({ tournament, round, stats, canReveal, onReveal }) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const isRevealable = canReveal && round.status === "closed" && !round.revealedAt;

  function handleReveal() {
    startTransition(async () => {
      setMessage("");
      try {
        const data = await revealTournamentRound(round.id);
        onReveal(data.item);
        setMessage("Round revealed.");
      } catch (error) {
        setMessage(error.message || "Failed to reveal round.");
      }
    });
  }

  async function handleCopyPrompt() {
    const prompt = buildCreatorPrompt({ tournament, round, stats });
    await navigator.clipboard.writeText(prompt);
    setMessage("Creator prompt copied.");
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {isRevealable ? (
        <button
          type="button"
          onClick={handleReveal}
          disabled={isPending}
          className="ui-button ui-button-primary"
        >
          {isPending ? "Revealing" : "Reveal Round"}
        </button>
      ) : null}
      <button type="button" onClick={handleCopyPrompt} className="ui-button ui-button-muted">
        Copy Creator Prompt
      </button>
      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
    </div>
  );
}

function ShareCardModal({ shareCard, onClose }) {
  const [message, setMessage] = useState("");

  if (!shareCard) {
    return null;
  }

  const { tournament, round, stats, isFinalResults } = shareCard;
  const items = getShareCardItems(stats);
  const cardTitle = buildShareCardTitle(round, tournament, isFinalResults);

  async function handleCopyText() {
    await navigator.clipboard.writeText(buildCreatorPrompt({ tournament, round, stats }));
    setMessage("Recap text copied.");
  }

  function handleDownloadSvg() {
    const svg = buildShareCardSvg({ tournament, round, stats, isFinalResults });
    downloadTextFile({
      filename: `${tournament.title}-${cardTitle}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".svg",
      text: svg,
      type: "image/svg+xml"
    });
    setMessage("SVG downloaded.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto border border-[var(--line)] bg-[var(--page-bg)] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="results-kicker">Share Card</p>
            <h2 className="display-face mt-2 text-2xl font-black">{cardTitle}</h2>
          </div>
          <button type="button" onClick={onClose} className="ui-button ui-button-muted">
            Close
          </button>
        </div>

        <div className="mt-4 aspect-video border border-[var(--line)] bg-[var(--panel)] p-6">
          <div className="grid h-full grid-rows-[auto_1fr_auto] border border-[var(--line-strong)] p-6">
            <div>
              <p className="display-face text-3xl font-black">BRACKERONI</p>
              <p className="display-face mt-8 text-3xl font-black text-[var(--accent-2)]">
                {cardTitle}
              </p>
              <h3 className="display-face mt-3 max-w-3xl text-4xl font-black leading-none">
                {tournament.title}
              </h3>
            </div>
            <div />
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((item, index) => (
                <div
                  key={item.label}
                  className={`min-h-[8rem] border p-4 ${
                    index % 2 === 0 ? "border-[var(--accent-3)]" : "border-[var(--accent-2)]"
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-3)]">
                    {item.label}
                  </p>
                  <div className="mt-3 grid grid-cols-[4.25rem_minmax(0,1fr)] gap-4">
                    {item.imageUrl ? (
                      <BackdropRemoteImage
                        src={item.imageUrl}
                        alt={item.value}
                        className="h-17 w-17 border border-[var(--line)]"
                        imageClassName="object-cover object-center"
                        undersizedImageClassName="object-contain p-1"
                        minimumSourceWidth={68}
                        minimumSourceHeight={68}
                      />
                    ) : (
                      <div className="h-17 w-17 border border-[var(--line)] bg-[var(--panel-2)]" />
                    )}
                    <div className="min-w-0">
                      <p className="display-face text-2xl font-black leading-[1.05]">
                        {item.value}
                      </p>
                      {item.detail ? (
                        <p className="mt-2 truncate text-sm leading-5 text-[var(--muted)]">
                          {item.detail}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleDownloadSvg} className="ui-button ui-button-primary">
            Download SVG
          </button>
          <button type="button" onClick={handleCopyText} className="ui-button ui-button-muted">
            Copy Recap Text
          </button>
          {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}

function RoundStatCard({ label, value, detail, tieCount = 0, tone = "blue" }) {
  const toneClass =
    tone === "yellow"
      ? "border-[var(--accent-2)]/80 shadow-[inset_0_0_0_1px_rgba(255,216,77,0.18)]"
      : "border-[var(--accent-3)]/80 shadow-[inset_0_0_0_1px_rgba(52,211,196,0.18)]";

  return (
    <div className={`border bg-transparent px-4 py-4 ${toneClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-3)]">
        {label}
      </p>
      <p className="display-face mt-3 text-xl font-black leading-[1.03] text-[var(--ink)]">
        {value}
        {tieCount > 0 ? (
          <span className="mt-1 block font-serif text-[11px] font-bold lowercase tracking-normal text-[var(--muted)]">
            ({formatTieSuffix(tieCount)})
          </span>
        ) : null}
      </p>
      {detail ? (
        <p className="mt-3 font-serif text-sm leading-6 text-[var(--muted)]">{detail}</p>
      ) : null}
    </div>
  );
}

function WinnerTile({ match, swissStats = null }) {
  const winnerSwissStats = swissStats?.get(match.winnerEntryId) || null;
  const pointsEarned = getSwissPointsEarned(match, match.winnerEntryId);

  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 border-t border-[var(--line)] py-4">
      {match.winnerImageUrl ? (
        <BackdropRemoteImage
          src={match.winnerImageUrl}
          alt={match.winnerName}
          className="h-[4.5rem] w-[4.5rem] border border-[var(--line)]"
          imageClassName="object-cover object-center"
          undersizedImageClassName="object-contain p-2"
          minimumSourceWidth={72}
          minimumSourceHeight={72}
        />
      ) : (
        <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center border border-[var(--line)] bg-[var(--panel-2)]">
          <span className="display-face text-xl font-black text-[var(--accent-2)]">
            {match.winnerSeed}
          </span>
        </div>
      )}
      <div className="min-w-0">
        <p className="display-face truncate text-xl font-black leading-tight text-[var(--ink)]">
          #{match.winnerSeed} {match.winnerName} ({match.winnerVotes})
        </p>
        {winnerSwissStats ? (
          <p className="mt-2 font-serif text-sm leading-6 text-[var(--accent-3)]">
            +{pointsEarned} point / {winnerSwissStats.points} total
          </p>
        ) : null}
        <p className="mt-1 font-serif text-sm leading-6 text-[var(--muted)]">
          defeated #{match.loserSeed} {match.loserName} ({match.loserVotes})
        </p>
      </div>
    </div>
  );
}

function orderFinalEntries(entries) {
  return [...(entries || [])].sort((left, right) => {
    const leftRank = left.finalRank ?? Number.MAX_SAFE_INTEGER;
    const rightRank = right.finalRank ?? Number.MAX_SAFE_INTEGER;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.seed - right.seed;
  });
}

function RankingTile({ entry, fallbackRank, swissStats = null }) {
  const rank = entry.finalRank ?? fallbackRank;
  const entrySwissStats = swissStats?.get(entry.id) || null;

  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 border-t border-[var(--line)] py-4">
      {entry.candidateImageUrl ? (
        <BackdropRemoteImage
          src={entry.candidateImageUrl}
          alt={entry.candidateName}
          className="h-[4.5rem] w-[4.5rem] border border-[var(--line)]"
          imageClassName="object-cover object-center"
          undersizedImageClassName="object-contain p-2"
          minimumSourceWidth={72}
          minimumSourceHeight={72}
        />
      ) : (
        <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center border border-[var(--line)] bg-[var(--panel-2)]">
          <span className="display-face text-xl font-black text-[var(--accent-2)]">#{rank}</span>
        </div>
      )}
      <div className="min-w-0">
        <p className="display-face truncate text-xl font-black leading-tight text-[var(--ink)]">
          #{rank} {entry.candidateName}
        </p>
        {entrySwissStats ? (
          <p className="mt-2 font-serif text-sm leading-6 text-[var(--accent-3)]">
            {entrySwissStats.points} pts / {entrySwissStats.wins}-{entrySwissStats.losses}
            {entrySwissStats.byes ? ` / ${entrySwissStats.byes} bye` : ""}
          </p>
        ) : null}
        <p className="mt-1 font-serif text-sm leading-6 text-[var(--muted)]">
          Original seed #{entry.seed}
        </p>
      </div>
    </div>
  );
}

function RoundProgressCard({
  tournament,
  round,
  matches,
  statMatches = matches,
  allMatches = statMatches,
  isFinalResults = false,
  isCreator,
  onOpenShareCard,
  onReveal
}) {
  const stats = getRoundStats(statMatches);
  const roundWinners = getRoundStats(matches).winners;
  const isRankingFinalResults =
    isFinalResults &&
    (usesSwissResultMode(tournament.resultMode) || tournament.resultMode !== "winner_only");
  const swissStats = usesSwissResultMode(tournament.resultMode)
    ? getSwissEntryStatsThroughRound(allMatches, round.roundNumber)
    : null;
  const finalEntries = isRankingFinalResults ? orderFinalEntries(tournament.entries).slice(0, 12) : [];
  const isHidden = round.status === "closed" && !round.revealedAt;

  return (
    <article
      id={`round-${round.id}`}
      className="scroll-mt-6 border-y border-[var(--line)] bg-transparent py-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="results-kicker">{round.status}</p>
          <h2 className="results-title text-4xl">
            {isFinalResults ? "Final Results" : formatRoundTitle(round, tournament)}
          </h2>
          <p className="results-meta">
            {round.matchCount} matchups | {getRoundStats(matches).totalVotes} votes
            {isHidden ? " | Hidden from participants" : ""}
            {round.revealedAt ? " | Revealed" : ""}
          </p>
        </div>
        <Link href={`/results/${tournament.id}`} className="ui-button ui-button-muted">
          Results
        </Link>
      </div>

      <div className="mt-6 grid gap-x-8 gap-y-2 md:grid-cols-2 xl:grid-cols-4">
        <RoundStatCard
          label="Most Votes"
          value={stats.voteLeader ? stats.voteLeader.name : "No votes yet"}
          tieCount={stats.voteLeaderTieCount}
          tone="blue"
          detail={
            stats.voteLeader
              ? `${stats.voteLeader.votes} votes | Seed ${stats.voteLeader.seed}`
              : null
          }
        />
        <RoundStatCard
          label="Closest Match"
          value={stats.closestMatch ? stats.closestMatch.winnerName : "No closed match yet"}
          tieCount={stats.closestMatchTieCount}
          tone="yellow"
          detail={
            stats.closestMatch
              ? `Beat ${stats.closestMatch.loserName} by ${stats.closestMatch.margin} votes`
              : null
          }
        />
        <RoundStatCard
          label="Biggest Blowout"
          value={stats.biggestBlowout ? stats.biggestBlowout.winnerName : "No closed match yet"}
          tieCount={stats.biggestBlowoutTieCount}
          tone="blue"
          detail={
            stats.biggestBlowout
              ? `${formatPercent(stats.biggestBlowout.winnerPercent)} over ${stats.biggestBlowout.loserName}`
              : null
          }
        />
        <RoundStatCard
          label="Biggest Upset"
          value={stats.biggestUpset ? stats.biggestUpset.winnerName : "No seed upset"}
          tieCount={stats.biggestUpsetTieCount}
          tone="yellow"
          detail={
            stats.biggestUpset
              ? `Seed ${stats.biggestUpset.winnerSeed} beat seed ${stats.biggestUpset.loserSeed}`
              : null
          }
        />
      </div>

      <div className="mt-5">
        <h3 className="font-serif text-sm font-bold uppercase tracking-[0.24em] text-[var(--accent-3)]">
          {isRankingFinalResults
            ? "Final Ranking"
            : isFinalResults
              ? "Champion"
              : usesSwissResultMode(tournament.resultMode)
                ? "Match Winners"
                : "Winners Advancing"}
        </h3>
        <div className="mt-3 grid gap-x-8 md:grid-cols-2">
          {isRankingFinalResults ? (
            finalEntries.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No final ranking is available yet.</p>
            ) : (
              finalEntries.map((entry, index) => (
                <RankingTile
                  key={entry.id}
                  entry={entry}
                  fallbackRank={index + 1}
                  swissStats={swissStats}
                />
              ))
            )
          ) : roundWinners.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No winners recorded for this round yet.</p>
          ) : (
            roundWinners.map((match) => (
              <WinnerTile key={match.id} match={match} swissStats={swissStats} />
            ))
          )}
        </div>
      </div>

      {isCreator ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <RoundRevealControls
            tournament={tournament}
            round={round}
            stats={stats}
            canReveal={isCreator}
            onReveal={onReveal}
          />
          <button
            type="button"
            onClick={() =>
              onOpenShareCard({
                tournament,
                round,
                stats,
                isFinalResults
              })
            }
            className="ui-button ui-button-accent"
          >
            Share Card
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function BracketProgressPage({ tournament, rounds, matches, isCreator }) {
  const [localRounds, setLocalRounds] = useState(rounds);
  const [shareCard, setShareCard] = useState(null);
  const orderedRounds = useMemo(
    () => [...localRounds].sort((left, right) => right.roundNumber - left.roundNumber),
    [localRounds]
  );
  const finalRoundNumber = useMemo(
    () => Math.max(...localRounds.map((round) => round.roundNumber), 0),
    [localRounds]
  );
  const matchesByRoundId = useMemo(() => {
    const grouped = new Map();

    for (const match of matches) {
      const current = grouped.get(match.roundId) || [];
      current.push(match);
      grouped.set(match.roundId, current);
    }

    return grouped;
  }, [matches]);

  function handleReveal(revealedRound) {
    setLocalRounds((current) =>
      current.map((round) =>
        round.id === revealedRound.id
          ? {
              ...round,
              revealedAt: revealedRound.revealedAt
            }
          : round
      )
    );
  }

  return (
    <div className="results-page">
      <section className="results-shell">
        <header className="results-header !pb-4">
          <div className="results-header-row">
            <div className="results-header-copy">
              <p className="results-kicker">Bracket Progress</p>
              <h1 className="display-face mt-2 max-w-4xl text-2xl font-black leading-tight text-[var(--ink)] md:text-3xl">
                {tournament.title}
              </h1>
              <p className="results-meta mt-3">
                {formatResultModeLabel(tournament.resultMode)} | Creator sees all rounds. Participants
                only see revealed progress.
              </p>
            </div>
            <div className="results-header-action">
              <Link href={`/results/${tournament.id}`} className="ui-button ui-button-muted">
                Final Results
              </Link>
            </div>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
          <aside className="lg:sticky lg:top-4">
            <div className="border-y border-[var(--line)] py-4">
              <p className="results-section-title">Rounds</p>
              <nav className="mt-3 flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
                {orderedRounds.map((round) => (
                  <a
                    key={round.id}
                    href={`#round-${round.id}`}
                    className="min-w-max border border-[var(--line)] px-3 py-2 text-left transition hover:border-[var(--accent-2)] hover:text-[var(--accent-2)] lg:min-w-0"
                  >
                    <span className="display-face block text-lg font-black">
                      {tournament.status === "complete" && round.roundNumber === finalRoundNumber
                        ? "Final Results"
                        : formatRoundTitle(round, tournament)}
                    </span>
                    <span className="mt-1 block text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                      {round.status}
                      {round.revealedAt ? " / revealed" : ""}
                    </span>
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="space-y-4">
          {orderedRounds.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No round progress is available yet.</p>
          ) : (
            orderedRounds.map((round) => (
              <RoundProgressCard
                key={round.id}
                tournament={tournament}
                round={round}
                matches={matchesByRoundId.get(round.id) || []}
                allMatches={matches}
                statMatches={
                  tournament.status === "complete" && round.roundNumber === finalRoundNumber
                    ? matches
                    : matchesByRoundId.get(round.id) || []
                }
                isFinalResults={
                  tournament.status === "complete" && round.roundNumber === finalRoundNumber
                }
                isCreator={isCreator}
                onOpenShareCard={setShareCard}
                onReveal={handleReveal}
              />
            ))
          )}
          </div>
        </div>
      </section>
      <ShareCardModal shareCard={shareCard} onClose={() => setShareCard(null)} />
    </div>
  );
}
