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
