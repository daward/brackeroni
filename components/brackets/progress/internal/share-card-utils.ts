import { formatPercent, formatRoundTitle, type RoundStats } from "./progress-policy";
import type { ShareCardPayload } from "./round-progress-card";

type ShareTournament = ShareCardPayload["tournament"];
type ShareRound = ShareCardPayload["round"];
type ShareCardItem = { label: string; value: string; detail: string; imageUrl: string | null };

export function buildCreatorPrompt({ tournament, round, stats }: { tournament: ShareTournament; round: ShareRound; stats: RoundStats }) {
  const bracketUrl = getBracketRoundsUrl(tournament.id);
  const lines = [
    `${formatRoundTitle(round, tournament)} is in the books for ${tournament.title}.`,
    stats.biggestUpset ? `Biggest upset: ${stats.biggestUpset.winner?.name} knocked out ${stats.biggestUpset.loser?.name}.` : null,
    stats.closestMatch
      ? `Closest call: ${stats.closestMatch.winner?.name} over ${stats.closestMatch.loser?.name}, ${stats.closestMatch.winnerVotes}-${stats.closestMatch.loserVotes}.`
      : null,
    `Follow the bracket here: ${bracketUrl}`,
    "After you vote in the next round, come back here and tell us who you're rooting for.",
  ].filter(Boolean);

  return lines.join("\n\n");
}

function getBracketRoundsUrl(tournamentId: string) {
  const path = `/results/${tournamentId}?view=rounds`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export function buildShareCardTitle(round: ShareRound, tournament: ShareTournament, isFinalResults: boolean) {
  return `${isFinalResults ? "Final Results" : formatRoundTitle(round, tournament)} Recap`;
}

export function getShareCardItems(stats: RoundStats): ShareCardItem[] {
  return [
    {
      label: "Most Votes",
      value: stats.voteLeader?.candidate.name || "No votes yet",
      detail: stats.voteLeader ? `${stats.voteLeader.votes} votes` : "",
      imageUrl: stats.voteLeader?.candidate.imageUrl || null,
    },
    {
      label: "Closest Match",
      value: stats.closestMatch?.winner?.name || "No closed match yet",
      detail: stats.closestMatch ? `Beat ${stats.closestMatch.loser?.name} by ${stats.closestMatch.margin}` : "",
      imageUrl: stats.closestMatch?.winner?.imageUrl || null,
    },
    {
      label: "Biggest Blowout",
      value: stats.biggestBlowout?.winner?.name || "No closed match yet",
      detail: stats.biggestBlowout ? `${formatPercent(stats.biggestBlowout.winnerPercent)} over ${stats.biggestBlowout.loser?.name}` : "",
      imageUrl: stats.biggestBlowout?.winner?.imageUrl || null,
    },
    {
      label: "Biggest Upset",
      value: stats.biggestUpset?.winner?.name || "No seed upset",
      detail: stats.biggestUpset ? `Seed ${stats.biggestUpset.winner?.seed} beat seed ${stats.biggestUpset.loser?.seed}` : "",
      imageUrl: stats.biggestUpset?.winner?.imageUrl || null,
    },
  ];
}

function escapeSvgText(value: unknown) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeSvgAttribute(value: unknown) {
  return escapeSvgText(value).replaceAll('"', "&quot;");
}

function wrapSvgText(value: unknown, maxLength: number) {
  const words = String(value || "")
    .split(/\s+/)
    .filter(Boolean);
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

export function buildShareCardSvg({ tournament, round, stats, isFinalResults }: ShareCardPayload) {
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
      const labelText = buildShareCardLabelText({
        label: item.label,
        x: x + 24,
        y: y + 36,
      });
      const valueText = valueLines
        .map((line, lineIndex) =>
          buildShareCardValueText({
            line,
            x: textX,
            y: y + 72 + lineIndex * 26,
          }),
        )
        .join("");

      return `
        <rect x="${x}" y="${y}" width="472" height="132" fill="none" stroke="${stroke}" stroke-width="3"/>
        ${labelText}
        ${imageSvg}
        ${valueText}
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
          `<text x="64" y="${236 + index * 42}" fill="#f6f2e8" font-size="40" font-family="Arial Narrow, Arial, sans-serif" font-weight="900">${escapeSvgText(line)}</text>`,
      )
      .join("")}
    ${itemSvg}
    <text x="64" y="625" fill="#b7b0a0" font-size="20" font-family="Georgia, serif">Vote, then come back and tell us who you're rooting for.</text>
    </svg>`;
}

function buildShareCardLabelText({ label, x, y }: { label: string; x: number; y: number }) {
  const text = escapeSvgText(label.toUpperCase());
  return [`<text x="${x}" y="${y}"`, 'fill="#34d3c4"', 'font-size="18"', 'font-family="Georgia, serif"', 'font-weight="700"', 'letter-spacing="4"', `>${text}</text>`].join(" ");
}

function buildShareCardValueText({ line, x, y }: { line: string; x: number; y: number }) {
  const text = escapeSvgText(line);
  return [`<text x="${x}" y="${y}"`, 'fill="#f6f2e8"', 'font-size="25"', 'font-family="Arial Narrow, Arial, sans-serif"', 'font-weight="900"', `>${text}</text>`].join(" ");
}
