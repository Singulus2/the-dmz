# BRD Business Request Documentation

We are doing rapid prototyping. You are the Project Owner. Lets research and define the next document. We need the Business Requirements Document with high-level geals from our perspective. I am YOUR client. I define what I want, you create the docs. Read into story.ad. The goal is a fully functional enterprise cybersecurity awareness training platfors, where you do NOT notice, you are actually learning.
Research enterprise requirements for such an app with 7 agents, Research how to do it as a game with 7 more agents, 30 it in parallel so di monitor the agents, lastend let then write findings to legean and compile the BRD.md from it. Make It FULLY!. Customer are not only enterprise, but because we are creating GAME everyday people are target as well

# DD Design Documentation

we are creating a cybersecurity awareess game.became an expert by reading our "Business Requirements Document (BRD.md)" to understand the goals for a cybersecurity awareness training game.Spawn 14 agents to define and research all aspects of the design document.Do not monitor them, put the output their findings in/logs// When they're done with their findings compile a comprehensive, exhaustive and well thought thorough design document (2nd phase of waterfall) in DD.md

# auto-develop.sh

The plan is to auto-develop this project. Here's how we are going to do this. We will have a shell script that does the following: 1. fetch the oldest gh issue from github. 2. Spawn one claude or codex (defined in args when calling the script) to conduct a full research on this issue. Reads a ton of code, provides extensive knowledge on the subject. Posts its research to gh in said issue. 3. spawns one claude / codex instance (also defined in args) to implement the issue and tests for it. 4. Spawns verifier agents (claude/codex) to a. verify correctness of the uncommited changes in the code and b. verify the uncommitted changes actually solve the given issue. These are TWO separate instances of claude or codex! That means TWO reviews! The FIRST word HAS to be etther ACCEPTED or DENIED! Tell them that in the prompt. 5. if the reviewers point out ANY problems, go back to 3. Reviews of 4. may NEVER be ignored/skipped. 6. If BOTH reviewers are green (first word in the docs is "ACCEPTED") with NO concerns at all, commit, push and close the issue ALL documents for the given issue are written into/logs/issues/[IssueNumber]. NEVER pipe the agents output to a file, rather TELL them in the prompt to write To a file. Tell implementer agents to read the Issue (accesible via bash/gh) AND the issues comments AND ALL documents within/logs/issues/[IssueNumber]. Ask questions before writing this bash script.

# milestones.md

aus den dd.mds wurde das milestones entwickelt

# create-issue.sh

die issues wurden aus den milestones.md entwickelt

Create a new script for the following, that ALSO has an iterative loop. While true, create a new issue for github. The agent to do that should be defined by agent claude codex, the next thing to define: The Milestone: -milestone [number]. It refers to a milestone within the MILESTONES.md document. The plan is, that you will prompt the agent to read ALL the relevant documentation (like you just did) and create ONE new issue via Bash "gh". Do let the agent call that by itself, no need to write that in code. It should be the ONE next logical issue to posate Polyqun exit if the agent truely has no issue left to define. In that case, let it output "DONE" as the first AND last word. Do check word is "DONE", else continue. Now, ask 10 questions about this workflow

10 questions about this workflow:
. Should the script also set the GitHub issue milestone field, or only use-milestone as a planning scope from docs/MILESTONES.md? 2. Do you want a strict issue title format (for example, M{n}-X: ...)? 5. Should the agent always add labels automatically, and if yes, which label set is mandatory?
Should duplicate detection consider only open issues, or both open and closed issues? 5. What minimum sections must each created issue body include (for example: context, acceptance criteria, test plan)? 5. Should the Loop continue immediately, or should it pause longer/back off between iterations? 2. Do you want a hard safety cap on iterations to avoid infinite loops if the agent misbehaves? 3. If gh issue create fails repeatedly, should the script keep looping forever or stop after N failures? 2. Should DONE be treated case-insensitively only as a standalone word, or also accept punctuation Like DONE.? 18. Should the script require a clean working tree before running, similar to your automation hygiene goals?

1. yes, but not the script, tell the AGENT to do that. 2. yes, that is exactly the right format. Oh important: If I do set-milestone 1337, it is NOT a milestone, thats going to be found, but a bug fix. So the agent is supposed to find a bug by itself within the code. 3. yes, no mandatory labels, but it can use all the labels there are. 4. open only and closed issues from this very milestone (1337 is an exception, here only open) 5.check one example issue with a milestone given for that. There are several solved MB issues for reference. 6. no pause 7. no 8. the script does NOT do gh issue create. THIS IS ONLY FOR THE AGENT! 9. case insensitive and accept punctuation 10. по

# Rekonstruierter Prompt — `auto-create-issues.sh`

Rekonstruktion des mutmaßlichen Claude-Code-Prompts, der `auto-create-issues.sh`
erzeugt hat. Abgeleitet aus einem Vergleich des Skripts mit seiner Vorlage
`auto-develop.sh` (geteilte Helfer, bewusst entfernte Bausteine, geänderte
Terminierung).

---

Nimm `auto-develop.sh` als **strukturelle Vorlage** und schreibe daraus ein neues
Skript `auto-create-issues.sh`. Übernimm den Bash-Stil unverändert:
`set -uo pipefail`, die `usage/die/warn/require_cmd`-Helfer, `validate_agent` und
`run_agent` (claude headless mit Permissions-Skip, `codex exec --yolo`,
`opencode run`), den Arg-Parser sowie den Preflight (Repo-Root ermitteln,
hineinwechseln, `gh auth status` prüfen).

**Zweck ist umgekehrt:** Das Skript soll Issues _anlegen_, nicht abarbeiten.
Entferne daher alles, was mit Implementieren, Review, Commit, Push, Close,
Finalizer, `jq`, dem GraphQL-Issue-Query und dem Owner-Check zu tun hat.

**CLI:** nur `--agent <claude|codex|opencode>` und `--milestone <number>`, plus
`-h/--help`. Beide Argumente sind Pflicht.

**Milestone-Auflösung:** Prüfe, dass `docs/MILESTONES.md` existiert und eine
Überschrift `### M<n>:` enthält (nutze `rg`, mit `grep -E`-Fallback wenn `rg`
fehlt); gib die Überschriftszeile in den Prompt.

**Ein-Issue-pro-Iteration-Schleife:** Instruiere den gewählten Agenten, **genau
ein** nächstes logisches Issue für die Milestone via `gh` selbst anzulegen (nicht
den Aufrufer bitten). Vorgeschriebene Lektüre vorab:
SOUL/MEMORY/AGENTS/MILESTONES/BRD/story/DDs/BRD-Research. Titelformat `M<n>-X:`,
X = nächste laufende Nummer, GitHub-Milestone-Feld setzen, Body im Stil gelöster
M0-Issues (Summary / Requirements / Acceptance-Criteria-Checkliste /
Dependencies). Dedup: offene Issues global **und** geschlossene Issues
**derselben** Milestone.

**Sondermodus `--milestone 1337`:** kein Docs-Lookup, Bug-Discovery statt
Milestone-Task — genau einen echten Bug im Code finden, Titel `M1337-X:`, **kein**
GitHub-Milestone-Feld, Dedup nur gegen offene Issues.

**Terminierungs-Protokoll:** Wenn nichts mehr anzulegen ist, soll der Agent `DONE`
als erstes _und_ letztes Wort ausgeben. Werte in jeder Iteration erstes/letztes
Wort der Agenten-Ausgabe aus (normalisiert). Beende die Schleife erst nach **drei
aufeinanderfolgenden DONE-Iterationen**; jede Nicht-DONE-Iteration setzt den
Streak zurück.

**Logging/Robustheit:** Jede Iteration timestamped nach
`logs/issue-creation/m<n>/iteration-<i>-<ts>.txt` schreiben; bei Nonzero-Exit des
Agenten warnen und weiterlaufen.

---

## Anmerkungen zur Herkunft

- **Vorlage mitgegeben:** `set -uo pipefail`, `usage/die/warn/require_cmd`,
  `validate_agent` und `run_agent` sind verbatim aus `auto-develop.sh`
  übernommen — der Prompt reichte die Vorlage als Kontext mit.
- **Bewusst entfernt:** kein `jq`, kein GraphQL-Query, keine
  `extract_verdict`/Commit-/Finalize-Maschinerie und **kein Owner-Check**
  (`auto-develop.sh` erzwingt `owner == TheMorpheus407`) — dadurch läuft das
  Erzeuger-Skript auch auf dem Fork.
- **Vermutlich explizite Nutzer-Vorgabe:** die 3×-DONE-Regel widerspricht dem
  Sofort-Abbruch der Vorlage — wahrscheinlich Wortlaut sinngemäß „nicht beim
  ersten DONE aufhören, sondern erst nach dreimal in Folge".
- **Vermutlich nachgereicht:** der `1337`-Modus ist als Sonderwert desselben
  `--milestone`-Flags durchgeschleift (statt eigenes `--mode`-Flag), was auf eine
  spätere Ergänzung statt Erst-Spezifikation hindeutet.
