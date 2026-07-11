# Prompt-Herkunft — The DMZ: Archive Gate

> Analyse: Welche Prompts wurden zur Erstellung dieses Projekts eingegeben?
> Erstellt am 2026-07-10 durch Auswertung der lokalen Claude-Code-Historie und des Repositorys.

## Kernbefund

Das Projekt wurde **nicht interaktiv auf diesem Rechner mit Claude Code getippt**, sondern
**vollautomatisch von einer Mehr-Agenten-Pipeline erzeugt** und anschließend hierher geklont.

Belege:

1. **Lokale Session-Historie ist leer.** Unter
   `~/.claude/projects/-home-bernd-Documents-java-ide-the-dmz/` existiert **nur die aktuelle
   Session** (`58716646-…jsonl`). Es gibt keine gespeicherten Erstellungs-Dialoge.

2. **Das Projekt wurde geklont, nicht lokal erzeugt.** Die globale Befehls-Historie
   (`~/.claude/history.jsonl`) enthält für dieses Projekt nur drei Einträge:
   ```
   cd ~/Documents/java/ide/VisualStudioCode/the-dmz
   git clone git@github.com:TheMorpheus407/the-dmz.git
   code ~/Documents/java/ide/the-dmz
   ```

3. **Die Git-Historie zeigt Bot-Autoren.** 858 Commits, davon 785 von
   „The Morpheus Tutorials" (Docs/Issues) und 73 von `DMZBot <dmzbot@themoz.code>` (Automatik).
   Kein menschlicher, interaktiver Claude-Code-Workflow.

**Konsequenz:** Die tatsächlich „eingegebenen" Prompts sind nicht als Chatverlauf gespeichert.
Sie sind aber vollständig aus dem Repository rekonstruierbar, weil das Projekt über ein
**skriptgesteuertes Prompt-System** (`auto-develop.sh`) läuft. Dort sind die Prompts fest kodiert.

---

## Wie das Projekt tatsächlich erzeugt wird

Die Erstellung erfolgt durch `auto-develop.sh` — eine Schleife, die pro GitHub-Issue **fünf
Agenten-Rollen** nacheinander aufruft. Jede Rolle bekommt einen fest kodierten Prompt.
Der Aufruf an Claude Code lautet (Zeile 61–62):

```bash
claude --dangerously-skip-permissions -p "$prompt"
```

Die eigentliche **Aufgabenbeschreibung** stammt jeweils aus dem GitHub-Issue — die Issue-Bodies
sind also der variable „Nutzer-Prompt", die fünf Templates unten der feste Rahmen.

### Ablauf pro Issue

```
Research  →  Implement  →  Review A (Korrektheit)
                       →  Review B (Issue-Abdeckung)
                ^                    |
                |  Loop bei DENIED   |
                +--------------------+
     Bei 2× ACCEPTED:  Finalize (commit, push, close)
```

---

## Die tatsächlichen Prompts (wörtlich aus `auto-develop.sh`)

Platzhalter wie `$issue_number`, `$research_file` werden zur Laufzeit ersetzt.

### 1. Research-Agent (Zeile 389–404)

```
You are the Research Agent for GitHub issue #$issue_number in this repository.

Requirements:
- Read the issue and all comments using the GitHub CLI (gh).
- Read relevant code and documentation in the repository.
- Provide deep research: current behavior, root cause analysis, impacted modules,
  constraints, alternative approaches, risks, and test ideas.
- Write your research to: $research_file (Markdown).
- Post your research as a comment on issue #$issue_number via gh.

Important:
- Write the full research to the file.
- Mention key findings in the file.
- If any expected file is missing, ignore it and continue. Do your best and do not error out.
```

### 2. Implementer-Agent (Zeile 430–445)

```
You are the Implementer Agent for GitHub issue #$issue_number in this repository.
${retry_context}

Requirements:
- Read the issue and all comments using the GitHub CLI (gh).
- Read ALL documents in: $issue_dir
- Implement the issue and add/update tests.
- Run tests if available.
- Write a summary to: $implementation_file (Markdown). Include changes made,
  files touched, and tests run.

Important:
- Do NOT commit changes.
- Write the documentation file directly.
- Check uncommitted files and existing artifacts; proceed even if some are missing.
  Do your best and do not error out.
```

Bei einer Wiederholung nach Ablehnung wird zusätzlich `${retry_context}` eingefügt (Zeile 415–427):

```
CRITICAL — RETRY AFTER DENIAL:
Your previous implementation was DENIED by reviewers. You MUST read the review feedback
before doing anything else:
- Reviewer A (correctness): $review_a_file
- Reviewer B (issue coverage): $review_b_file
Read these files FIRST. Fix ALL issues they raised. Do not repeat the same mistakes.
```

### 3. Reviewer A — Korrektheit (Zeile 453–469)

```
You are Reviewer A for GitHub issue #$issue_number. Focus: correctness of the uncommitted changes.

Requirements:
- Review the uncommitted changes (git diff, git status). Include untracked files!
- Check clean code, regressions, bugs, correctness, edge cases, complexity and
  maintainability, naming conventions, DRY, documentation within the code, test quality
  and coverage, separation of concerns, scalability, security, vulnerabilities, efficiency, UX-
- Run tests if available; if none are found, say so explicitly.
- Run pnpm lint; if it fails, start with DENIED and explain why.
- Run pnpm typecheck; if it fails, start with DENIED and explain why.
- The VERY FIRST LINE of the file MUST start with ACCEPTED or DENIED (no heading, no prefix,
  no markdown before it). Example first line: "ACCEPTED All checks pass." or "DENIED Lint failures found."
- If ANY concern exists, start with DENIED. Only start with ACCEPTED if there are NO concerns.
- Write your review to: $review_a_file

Important:
- Do NOT pipe output to a file. Write the file directly.
- Check uncommitted files and existing artifacts; proceed even if some are missing.
  Do your best and do not error out.
```

### 4. Reviewer B — Issue-Abdeckung (Zeile 477–493)

```
You are Reviewer B for GitHub issue #$issue_number. Focus: do the uncommitted changes solve the issue?

Requirements:
- Read the issue and comments, then evaluate the changes against the requirements.
  The goal is to PROOF, that the changes solve the given issue completely.
- Review the uncommitted changes (git diff, git status). Include untracked files!
- Run tests if available; if none are found, say so explicitly.
- Run pnpm lint; if it fails, start with DENIED and explain why.
- Run pnpm typecheck; if it fails, start with DENIED and explain why.
- The VERY FIRST LINE of the file MUST start with ACCEPTED or DENIED (no heading, no prefix,
  no markdown before it). Example first line: "ACCEPTED All requirements met." or "DENIED Missing test coverage."
- If ANY concern exists, start with DENIED. Only start with ACCEPTED if there are NO concerns.
- Write your review to: $review_b_file

Important:
- Write findings to the review document directly.
- Check uncommitted files and existing artifacts; proceed even if some are missing.
  Do your best and do not error out.
```

### 5. Finalizer-Agent (Zeile 527–543)

```
You are the Finalizer Agent for GitHub issue #$issue_number in this repository.

Requirements:
- Read the issue and comments with gh before finalizing.
- Review and stage all relevant uncommitted changes.
- Run pnpm typecheck and pnpm lint before committing. If they fail, fix the code and rerun until they pass.
- Commit using this exact commit message file: $commit_msg_file
- Push to branch: $target_branch
- Close issue #$issue_number with a short comment after a successful push.
- Write a summary to: $finalize_file (Markdown), including commands run and final git status.

Important:
- Do not use interactive git commands.
- Do not skip hooks.
- Do your best and do not error out if a single command fails; recover and continue until complete.
```

---

## Die variablen „Nutzer-Prompts": die GitHub-Issues

Der eigentliche Aufgaben-Input pro Durchlauf ist der **Issue-Body**. Diese wurden vorab
von `TheMorpheus407` erstellt und liegen als Snapshots unter `logs/issues/<N>/issue.json`.

Beispiel — Issue #1 (`logs/issues/1/issue.json`):

```
TITLE:  M0-01: Initialize pnpm monorepo workspace
AUTHOR: TheMorpheus407
LABELS: M0: Bootstrap, infrastructure, devtools

## Summary
Set up the root monorepo structure using pnpm workspaces with Turborepo for build
orchestration. This is the foundational issue that all other M0 work depends on.

## Requirements
### Monorepo Structure
  the-dmz/ ├── apps/ (web, api) ├── packages/shared …
### Root package.json
  - pnpm workspaces configuration
  - Shared dev scripts: dev, build, lint, test, typecheck, clean
  - Engine constraints: Node.js >= 22, pnpm >= 9
…
```

Pro Issue speichert die Pipeline die Zwischenergebnisse (nicht die Prompts, aber deren Output):

| Datei | Inhalt |
|-------|--------|
| `logs/issues/<N>/issue.json` | Issue-Snapshot = effektiver Aufgaben-Prompt |
| `logs/issues/<N>/research.md` | Ausgabe des Research-Agenten |
| `logs/issues/<N>/implementation.md` | Ausgabe des Implementer-Agenten |
| `logs/issues/<N>/review-1.md` | Verdikt Reviewer A |
| `logs/issues/<N>/review-2.md` | Verdikt Reviewer B |
| `logs/issues/<N>/finalization.md` | Zusammenfassung Finalizer |

Im geklonten Repo sind noch **18 solcher Issue-Ordner** vorhanden.

---

## Wie die Issues selbst erzeugt wurden (`auto-create-issues.sh`)

Die GitHub-Issues sind **nicht von Hand geschrieben**, sondern ebenfalls von einem Agenten per
Prompt erzeugt. Das Skript `auto-create-issues.sh` ruft in einer Schleife einen „Issue Planning
Agent" auf, der pro Durchlauf **genau ein** neues Issue anlegt (via `gh` CLI selbst), bis der
Agent dreimal in Folge `DONE` zurückgibt. Aufruf identisch zu oben:
`claude --dangerously-skip-permissions -p "$prompt"` (Zeile 47).

Es gibt **zwei Prompt-Varianten**, gesteuert über `--milestone`:

### A) Meilenstein-Modus (Zeile 210–252)

Bezieht sich auf eine Überschrift aus `docs/MILESTONES.md` (M0–M16):

```
You are the Issue Planning Agent for milestone M${MILESTONE} in this repository.
Milestone reference from docs/MILESTONES.md: ${milestone_heading}

Goal:
- Create exactly ONE next logical GitHub issue for milestone M${MILESTONE}.
- Use Bash and gh CLI yourself to create the issue.
- Do not ask the caller to run gh commands.

Required reading before deciding:
- SOUL.md
- MEMORY.md
- AGENTS.md
- docs/MILESTONES.md
- docs/BRD.md
- docs/story.md
- docs/DD/*
- Relevant docs/BRD/* files
- Existing GitHub issues/comments via gh

Issue creation rules:
- Title format MUST be: M${MILESTONE}-X: <concise title>
- Determine X as the next logical sequence number for this milestone.
- Set the GitHub issue milestone when creating the issue.
- No mandatory labels. You may apply any existing repository labels you judge useful.
- Include a detailed body modeled after solved M0 issues (for structure):
  - Summary
  - Requirements
  - Acceptance Criteria checklist
  - Dependencies / references
- Before drafting, inspect at least one solved M0 issue body for style reference …

Deduplication rules:
- Check OPEN issues globally.
- Also check CLOSED issues from this same milestone (M${MILESTONE}) to avoid re-creating solved work.

Termination rule:
- If no issue remains to define for milestone M${MILESTONE}, output DONE as the first word
  and DONE as the last word.
```

### B) Bug-Fix-Discovery-Modus (`--milestone 1337`, Zeile 167–207)

Kein echter Meilenstein — der Agent **sucht selbst einen echten Bug** im Code und legt dafür ein
Issue an (Titel-Format `M1337-X: …`). Das erklärt die aktuellen Commit-Betreffs im Repo wie
`feat(backend): [high] verifyjwt returns untyped payload …` — sie stammen aus solchen
Bug-Discovery-Issues:

```
You are the Issue Planning Agent in bug-fix discovery mode for this repository.

Goal:
- Find exactly ONE real bug in the current codebase and create exactly ONE GitHub issue for it.
- Use Bash and gh CLI yourself to create the issue.

Required reading before deciding:
- SOUL.md / MEMORY.md / AGENTS.md
- docs/BRD.md / docs/story.md / docs/DD/* / relevant docs/BRD/*
- Existing open issues via gh (duplicate check is OPEN issues only)

Issue creation rules:
- Title format MUST be: M1337-X: <concise bug title>
- Include a detailed body (Summary, Requirements/reproduction, Acceptance Criteria, Dependencies).

Termination rule:
- If no new bug issue remains, output DONE as the first word and DONE as the last word.
```

**Damit ist die gesamte Kette rekonstruierbar:**

```
auto-create-issues.sh  →  erzeugt GitHub-Issues (aus MILESTONES.md / Bug-Discovery)
        │
        ▼
auto-develop.sh        →  löst jedes Issue (Research → Implement → Review×2 → Finalize)
```

Beide Skripte lesen dieselben Steuer-Dokumente (`SOUL.md`, `MEMORY.md`, `AGENTS.md`, `docs/*`).
Hinweis: Der Log-Ordner `logs/issue-creation/` wurde nicht mitgeklont (nur die Skript-Logik ist da).

---

## Der `docs`-Ordner: das Quell-Korpus, aus dem alles abgeleitet wird

Der `docs`-Ordner ist die **inhaltliche Vorlage** ganz am Anfang der Kette. Beide Automatik-Skripte
lesen ihn als Pflichtlektüre (`docs/MILESTONES.md`, `docs/BRD.md`, `docs/story.md`, `docs/DD/*`,
`docs/BRD/*`), bevor sie ein Issue planen. Ohne diese Dokumente gäbe es keine Aufgaben.

### Zwei klar getrennte Schichten

**Schicht 1 — Das generierte Design-Korpus (der „Seed", Ursprung: vor dem Loop).**
Am 2026-02-05/06 in Sammel-Commits („cleanup", „Business Requirements Document",
„Add 14 Design Documents …") auf einmal eingecheckt. Alle tragen `Version: 1.0`, dasselbe Datum
und fiktive Autoren-Teams (z. B. „Systems Architecture, AI/ML Engineering, Narrative Design") —
typische Merkmale eines KI-generierten Dokumentensatzes, nicht organisch gewachsener Doku.

| Bereich | Umfang | Rolle |
|---------|--------|-------|
| `docs/story.md` | 68 Z. | Spiel-Prämisse (NIDHOGG/Stuxnet, Matrices GmbH, Spielerrolle) — narrativer Kern |
| `docs/BRD.md` | 1.417 Z. | Business Requirements — das „Was & Warum" des Produkts |
| `docs/BRD/` (14 Dateien) | ~22.650 Z. | Vertiefende Marktforschung (Markt, Regulatorik, LMS, Threats, Ökonomie …) |
| `docs/DD/` (14 Dateien) | ~24.740 Z. | Design Documents DD-01…DD-14 — die technischen Spezifikationen je System |
| `docs/MILESTONES.md` | 587 Z. | Roadmap M0–M16 — **die direkte Vorlage für `auto-create-issues.sh`** |

Aus diesem Korpus leitet der Issue-Planungs-Agent die Aufgaben ab: `MILESTONES.md` liefert die
Meilenstein-Überschriften, die DDs die fachlichen Details, die BRDs den Kontext. Die Prompts
*dieser* Erzeugung sind nicht gespeichert (siehe Zusammenfassung).

#### Fokus: `docs/BRD.md` — das Wurzeldokument

Die `docs/BRD.md` (1.417 Zeilen) ist die inhaltliche Wurzel des gesamten Korpus; alles andere
(DDs, Meilensteine) detailliert sie aus. Ihr Aufbau bestätigt die „generierter Seed"-These
besonders deutlich:

- **Document-Control-Block** am Anfang: `Version: 1.0`, `Date: 2026-02-05`,
  `Author: Matrices GmbH Product & Strategy Team` (das fiktive In-Story-Unternehmen),
  `Document ID: BRD-DMZ-2026-001`, `Status: Draft for Stakeholder Review`. Ein formal
  perfekt strukturiertes, an einem einzigen Tag entstandenes Investoren-Dokument.
- **17 nummerierte Abschnitte** — von Executive Summary, Marktanalyse und Zielgruppen über
  Functional/Non-Functional Requirements (FR-…-Codes), Compliance, Enterprise-Integration,
  Game Design, Monetarisierung und Go-to-Market bis Risikoanalyse, Roadmap und KPIs.
- Sie enthält die **konkreten Requirement-IDs** (z. B. `FR-GAME-003`, `FR-ENT-007`), auf die
  sich die Design Documents und später die Issues berufen — die formale Brücke vom Business-
  Wunsch zur technischen Umsetzung.

Auch hier gilt die Abgrenzung: Wenn die BRD von KI-Generierung spricht (etwa
`FR-GAME-003: generate phishing emails using AI (Anthropic Claude API primary …)`), meint das
eine **Spiel-Funktion**, nicht die Art, wie das Repository gebaut wurde.

**Kernbemerkung:** Die BRD dokumentiert an keiner Stelle, mit welchen Prompts sie selbst
erzeugt wurde. Sie ist das Ergebnis genau jener nicht gespeicherten ersten Prompt-Stufe — das
Wurzel-Artefakt, aus dem die gesamte nachgelagerte Automatik (Issues → Umsetzung) ihre Inhalte
zieht. Ihre 14 vertiefenden Marktforschungs-Dateien unter `docs/BRD/` (z. B.
`01_market_analysis.md`) sind auf dieselbe Weise entstanden: strukturierte, an einem Tag
eingecheckte Zulieferdokumente ohne festgehaltene Erzeugungs-Prompts.

**Schicht 2 — Als Output des Entwicklungs-Loops entstandene Doku.**
Die restlichen `docs/*`-Dateien wurden **während** der Entwicklung von den Agenten erzeugt und
tragen `Issue #N:`-Commits. Sie sind also Ergebnis der oben beschriebenen Prompts, nicht deren
Eingabe:

- **Contract-/Workflow-Dokumente** (Top-Level): z. B. `PAGINATION_CONTRACT_WORKFLOW.md`,
  `EVENT_CONTRACT_EVOLUTION.md`, `tenant-isolation-gate.md`, `LOGGING_CONTRACT.md`,
  `error-contract-workflow.md`, `mfa-contract-workflow.md` — Schnittstellen-Verträge aus M0/M1.
- **`docs/adr/`** — Architecture Decision Records (Template + ADR 001–005: SvelteKit, Modular
  Monolith, Event-Sourcing, PostgreSQL-RLS, Shared-Schema-Tenancy).
- **`docs/security/`** — `encryption.md`, `pii-handling.md`, `threat-modeling.md`, README.
- **`docs/backend/`** — Hook-Chain-, Modul-Registrierungs-, Rate-Limit-Policies.
- **`docs/accessibility/`** — VPAT-Report (WCAG-Konformität).

### Wichtige Abgrenzung: „Prompt" ≠ In-Game-Prompt-System

`docs/DD/03_ai_content_pipeline.md` enthält einen Abschnitt „Prompt System and Template
Management". **Das betrifft nicht die Projekterstellung**, sondern eine *Spielmechanik*: Wie das
fertige Spiel zur Laufzeit per Claude-API Phishing-E-Mail-Inhalte generiert. Nicht mit den
Build-Prompts dieses Berichts verwechseln.

---

## Der persistente System-Prompt-Kontext (die MD-Steuerdateien)

Die kurzen Rollen-Prompts oben funktionieren nur, weil jeder Claude-Code-Aufruf **automatisch**
einen großen, festen Kontext mitbekommt. Claude Code lädt beim Start `CLAUDE.md`, und diese Datei
zieht per `@`-Import die drei weiteren Dokumente nach. Zusammen bilden sie den eigentlichen
„System-Prompt" des Projekts — sie legen fest, *wer* der Agent ist, *was* er bauen soll und *was
er nicht darf*. (`auto-create-issues.sh` und `auto-develop.sh` verweisen zusätzlich explizit auf
`SOUL.md`, `MEMORY.md`, `AGENTS.md` als Pflichtlektüre.)

Kopf von `CLAUDE.md`, der die anderen einbindet:

```markdown
# Claude Code Instructions — The DMZ: Archive Gate
@AGENTS.md
@SOUL.md
@MEMORY.md
```

### Rolle jeder Datei

| Datei | Funktion im Prompt-System | Wesentlicher Inhalt |
|-------|---------------------------|---------------------|
| **`SOUL.md`** | *Identität & Standards* — das „Wer & Wie" | Projekt-Pitch („Duolingo for Cybersecurity", NIDHOGG-Story), vollständiger Tech-Stack (SvelteKit 2/Svelte 5, Fastify 5, PostgreSQL+RLS, Drizzle, Turborepo, pnpm), 7 Architektur-Prinzipien (Event-Sourcing ab Tag 1, `tenant_id` überall, WCAG-AA, Privacy-by-Design), Coding-/Security-Standards, DD-Index (14 Design Docs) |
| **`AGENTS.md`** | *Regeln & Leitplanken* — das „Was erlaubt/verboten" | Boundary „Project Root Only", Repo-Layout, Befehlsreferenz, Git-/Datei-Konventionen (named exports, Test-Kolokation), Beschreibung der `auto-develop.sh`-Pipeline und — zentral — eine lange **Liste verbotener Aktionen** (Filesystem, Git, System, Content) |
| **`CLAUDE.md`** | *Claude-Code-spezifische Erweiterung* — das „Womit" | Sub-Agenten-Tabelle (`frontend`, `backend`, `database`, `testing`, `devops`, `reviewer`) mit Einsatzregeln, Monorepo-Layout, Tool-Präferenzen (Read/Edit/Grep statt Bash; `gh` für GitHub; `pnpm --filter`), Automatisierungshinweise |
| **`MEMORY.md`** | *Lebender Zustand* — das „Wo stehen wir" | Aktueller Meilenstein (M2), erledigte Arbeit (M0/M1), Tech-Entscheidungs-Logbuch mit Daten, offene Issue-Liste, bekannte Blocker, Seeding-Doku. Wird laut eigener Anweisung nach jedem Meilenstein aktualisiert |

### Warum das zusammen der eigentliche Prompt ist

Ein Rollen-Prompt wie „You are the Implementer Agent for issue #131" enthält **keinerlei**
Tech-Stack, Stilregeln oder Architektur. All das kommt aus den vier MD-Dateien. Der Agent
kombiniert also bei jedem Lauf:

```
[ CLAUDE.md + AGENTS.md + SOUL.md + MEMORY.md ]   ← fester System-Kontext (das „Betriebssystem")
              +
[ Rollen-Prompt aus auto-develop.sh ]             ← die konkrete Aufgabe (Research/Impl/Review/…)
              +
[ Issue-Body aus GitHub ]                          ← der variable Detail-Input
```

Änderungen an einer der MD-Dateien verändern damit das Verhalten **aller** künftigen
Agentenläufe — sie sind der Hebel, mit dem das gesamte generierte Projekt gesteuert wird.
Genau deshalb stehen `SOUL.md`, `AGENTS.md` und `auto-develop.sh` selbst auf der Liste der
Dateien, die ohne ausdrückliche Anweisung nicht verändert werden dürfen.

---

## Zusammenfassung

| Frage | Antwort |
|-------|---------|
| Wurden Prompts lokal getippt? | Nein — Projekt wurde von GitHub geklont |
| Gibt es einen gespeicherten Chatverlauf? | Nein, nur die aktuelle Analyse-Session |
| Wo stehen die echten Prompts? | Fest kodiert in `auto-develop.sh` (5 Rollen-Templates) |
| Was war der variable Aufgaben-Input? | Die GitHub-Issue-Bodies (Autor: `TheMorpheus407`) |
| Wie entstanden die Issues? | Per Prompt in `auto-create-issues.sh` (Meilenstein- + Bug-Discovery-Modus) |
| Was steuerte Stil/Regeln? | `CLAUDE.md`, `AGENTS.md`, `SOUL.md`, `MEMORY.md` (fester System-Kontext) |
| Womit wurde ausgeführt? | `claude --dangerously-skip-permissions -p "$prompt"` |

**Vollständig rekonstruierbar** sind damit: die 5 Entwicklungs-Rollen-Prompts, die 2
Issue-Planungs-Prompts und der gesamte MD-System-Kontext — alles liegt im Repo.

**Nicht rekonstruierbar** bleibt nur die allererste Stufe: die Prompts, mit denen die
Grundlagen-Dokumente (`docs/BRD.md`, die 14 Design Documents, `docs/story.md`, `docs/MILESTONES.md`)
und die vier MD-Steuerdateien ursprünglich erzeugt wurden. Diese existierten bereits, bevor die
automatisierten Loops starteten; von ihnen ist nur das Ergebnis vorhanden, nicht die Eingabe.
Sie bilden aber die inhaltliche Vorlage, aus der `auto-create-issues.sh` alle Issues ableitet.
```
