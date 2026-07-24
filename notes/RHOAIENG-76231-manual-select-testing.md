# RHOAIENG-76231 — Manual select/dropdown testing runbook

Branch: `RHOAIENG-76231/modal-dropdown-a11y`  
Ticket: [RHOAIENG-76231](https://redhat.atlassian.net/browse/RHOAIENG-76231) — remaining modal dropdown a11y (follow-up to [RHOAIENG-66822](https://redhat.atlassian.net/browse/RHOAIENG-66822)).

This runbook is the executable manual test guide. Follow phases in order from a fresh workspace on a live OpenShift cluster. Prefer VoiceOver / NVDA / JAWS for acceptance criteria; keyboard-only still catches Tab/Escape regressions.

---

## Legend (read first)

Every control below is tagged:

| Tag | Meaning |
|-----|---------|
| **CHANGED vs main** | Control lives in a PatternFly **Modal** / dialog. On `main`, the menu is often clipped, unreachable to screen readers, or **Escape** / **Tab** dismisses the **modal**. On this branch, the menu portals into the dialog, overflow unlocks, SR can open/arrow/select, and **Tab** / **Escape** close the **menu** while the modal stays open. |
| **REGRESSION** | Same shared wrapper, but **not** the bug surface for this ticket (page-level, spawner non-modal, or already fixed in 66822). Expect parity with current `main` / post-66822 behavior — not a new modal fix. Still smoke-test so the shared hook did not break them. |

> **Callout:** Dropdowns **inside PatternFly Modals** using the wrappers below are the ones whose keyboard/SR behavior should **differ from `main`**. Page-level and non-modal spawner selects share code but should feel the same as today unless already fixed by 66822.

---

## What changed (test focus)

| Wrapper | Path | Modal focus |
|---------|------|-------------|
| **TypeaheadSelect** | `packages/ui-core/src/components/TypeaheadSelect.tsx` | Primary 76231 fix (combobox ARIA + modal popper) |
| **DropdownFormField** | `frontend/src/concepts/connectionTypes/fields/DropdownFormField.tsx` | Connection-type dropdown fields (e.g. OCI Access type) |
| **ValueUnitField** | `packages/ui-core/src/components/ValueUnitField.tsx` | Size unit dropdown in storage modals |
| **SearchSelector** | `packages/ui-core/src/components/searchSelector/SearchSelector.tsx` | Project pickers in modals |
| **ConnectionDropdown** | `frontend/src/concepts/modelRegistry/content/ConnectionDropdown.tsx` | MR autofill **Connection** modal |
| **SimpleSelect** + **StorageClassSelect** | `packages/ui-core/.../SimpleSelect.tsx` + `frontend/.../StorageClassSelect.tsx` | Shared hook refactor; StorageClassSelect no longer overrides `appendTo` when unset |
| **MultiSelection** | `frontend/src/components/MultiSelection.tsx` | Regression only (66822) |
| Shared hook | `packages/ui-core/src/utilities/useMenuPopperInModal.ts` | Dialog-aware `appendTo` + overflow unlock |

### Per-control checklist (apply to every **CHANGED vs main** row)

1. Open/close — toggle `aria-expanded` `false` → `true` → `false`
2. Keyboard — Arrow keys move highlight; Enter/Space selects
3. **Tab** with menu open — menu closes; **modal stays open**; focus remains in dialog
4. **Escape** with menu open — menu closes; **modal stays open** (on `main` this often closes the modal)
5. Clipping — full option list visible / reachable inside the dialog (not cut off by overflow)
6. Screen reader (VO/NVDA/JAWS) — announce options; arrow and select
7. TypeaheadSelect only — `aria-controls` points at listbox; `aria-activedescendant` tracks focused option

### Per-control checklist (apply to every **REGRESSION** row)

1. Open, select, close with mouse and keyboard
2. No new clipping or broken labels vs `main`
3. Look & feel unchanged (PF spacing, full-width toggles)

---

## Phase 0 — Environment setup

### Cluster prerequisites

- Open Data Hub / RHOAI Dashboard installed
- User with project create access (cluster-admin simplifies admin phases)
- At least one Notebook ImageStream, storage class, and (for Phase 2) model serving / model registry if those operators are installed

### Commands

```bash
git checkout RHOAIENG-76231/modal-dropdown-a11y
npm install
npm run build
make login          # or: oc login <api-url> -u <user> -p <password>
npm run dev         # backend :4000 + frontend :4010 — enough for this runbook
```

Open **http://localhost:4010** and log in with cluster credentials.

Use either `npm run dev` **or** `npm run start`, not both (they compete for ports 4000/4010). Prefer `npm run dev` unless you need federated modules (Model Registry BFF). For Phase 2B/2C, use `npm run start` if MR UI is federated in your env.

Re-run `make login` and restart the dev server if the session expires.

### Optional feature flags

- NIM deploy paths: enable NIM / gen-ai flags via dev banner or `?devFeatureFlags=...` if your cluster uses them
- Model Registry: requires MR operator + registry instance

---

## Phase 1 — CHANGED vs main (ticket AC — do first)

Create a project if needed:

| Step | Action | Test data |
|------|--------|-----------|
| 1 | Sidebar → **Projects** | — |
| 2 | **Create project** | Display / resource name: `manual-76231-test` |

Land on `/projects/manual-76231-test`.

### 1A. Create connection — Connection type

| | |
|--|--|
| **Tag** | **CHANGED vs main** |
| **Wrapper** | `TypeaheadSelect` via `ConnectionTypeForm` |
| **Navigation** | Projects → `manual-76231-test` → **Connections** → **Create connection** |
| **Control** | **Connection type** combobox (`data-testid="connection-type-dropdown"`) |

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Open Create connection modal | [ ] |
| 2 | Focus Connection type; open with keyboard | [ ] |
| 3 | Arrow through types; select one (e.g. S3) | [ ] |
| 4 | With menu open: **Tab** — menu closes, modal stays | [ ] |
| 5 | Re-open; **Escape** — menu closes, modal stays | [ ] |
| 6 | (SR) Open, arrow, select announced correctly | [ ] |

**vs main:** On `main`, Escape often closes the whole Create connection modal; menu may be clipped or hard for SR. On this branch, Escape/Tab only dismiss the menu.

Fill enough fields to create `test-s3-connection` if you will need it in Phase 2 (optional for 1A alone).

### 1A2. Create connection — Access type (OCI connection-type dropdown)

| | |
|--|--|
| **Tag** | **CHANGED vs main** |
| **Wrapper** | Raw PF `Select` via `DropdownFormField` + `useMenuPopperInModal` |
| **Navigation** | Projects → project → **Connections** → **Create connection** → select connection type **OCI** (or any type with a Dropdown field) |
| **Control** | **Access type** (multi-select; Push secret / Pull secret) |
| **Prerequisite** | Complete Connection type selection first (1A) |

| Step | Action | Pass? |
|------|--------|-------|
| 1 | After selecting OCI, locate **Access type** | [ ] |
| 2 | Open with keyboard; arrow through Push / Pull; select (Space/Enter) | [ ] |
| 3 | With menu open: **Tab** — menu closes, modal stays | [ ] |
| 4 | Re-open; **Escape** — menu closes, modal stays | [ ] |
| 5 | (SR) Options reachable and announced inside the dialog | [ ] |

**vs main:** Same modal clipping / focus-trap issue as other Create connection menus. This control is not SimpleSelect/MultiSelection; the shared popper hook is applied on the raw Select.

### 1B. Create connection from workbench

| | |
|--|--|
| **Tag** | **CHANGED vs main** |
| **Wrapper** | Same `TypeaheadSelect` |
| **Navigation** | Projects → project → **Workbenches** → **Create workbench** → Connections → **Create connection** |
| **Control** | Connection type combobox in nested modal |

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Open Create connection from spawner | [ ] |
| 2 | Repeat open / arrow / Tab / Escape checks from 1A | [ ] |

### 1C. Attach existing storage — PVC typeahead

| | |
|--|--|
| **Tag** | **CHANGED vs main** |
| **Wrapper** | `TypeaheadSelect` via `AddExistingStorageField` |
| **Navigation** | Workbenches → Create/Edit workbench → Cluster storage → **Attach existing storage** |
| **Control** | Persistent storage typeahead (label **Persistent storage**) |
| **Prerequisite** | At least one PVC in the project (create via 1D/1E first if empty) |

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Open Attach existing storage modal | [ ] |
| 2 | Open PVC typeahead; filter/type; arrow; select | [ ] |
| 3 | Tab / Escape close menu, not modal | [ ] |
| 4 | (SR) Options reachable and selectable | [ ] |

**vs main:** Same Escape/Tab-vs-modal and clipping issues as other modal typeaheads.

### 1D. Create storage (workbench) — size unit + storage class

| | |
|--|--|
| **Tag** | **CHANGED vs main** |
| **Wrappers** | `ValueUnitField` (size unit); `SimpleSelect` / `StorageClassSelect` (storage class) |
| **Navigation** | Workbenches → Create/Edit → Cluster storage → **Create storage** |
| **Controls** | Persistent storage size unit dropdown; **Storage class** |

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Open Create storage modal | [ ] |
| 2 | Size unit dropdown — open, arrow (if supported), select Gi/Mi | [ ] |
| 3 | Tab / Escape close unit menu, not modal | [ ] |
| 4 | Storage class — open, select; menu not clipped | [ ] |
| 5 | Tab / Escape close storage class menu, not modal | [ ] |
| 6 | Name `wb-storage`, size `8`, mount path valid; create if useful for 1C | [ ] |

**vs main:** Size unit (`ValueUnitField`) and StorageClassSelect append behavior are the 76231 focus here. Note: arrow-key navigation on the **unit** dropdown may still be limited by PatternFly Dropdown (pre-existing); still verify Tab/Escape and SR open/select.

### 1E. Add cluster storage (project tab)

| | |
|--|--|
| **Tag** | **CHANGED vs main** |
| **Wrappers** | Same as 1D |
| **Navigation** | Projects → project → **Cluster storage** → **Add cluster storage** |
| **Controls** | Size unit + Storage class |

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Open Add cluster storage modal | [ ] |
| 2 | Repeat size unit + storage class checks from 1D | [ ] |
| 3 | Optional: Update storage (row ⋮ → Update) — same controls | [ ] |

---

## Phase 2 — CHANGED vs main (model serving / Model Registry)

### 2A. Deploy model — Existing connection

| | |
|--|--|
| **Tag** | **CHANGED vs main** |
| **Wrapper** | `TypeaheadSelect` via `ExistingConnectionField` |
| **Navigation** | Projects → project → **Models** (or Model serving) → **Deploy model** → Storage → **Existing connection** |
| **Control** | Connection typeahead |
| **Prerequisite** | Connection from Phase 1A; serving runtime available |

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Open Deploy model flow; choose Existing connection | [ ] |
| 2 | Open connection typeahead; arrow/filter; select | [ ] |
| 3 | Tab / Escape close menu, not deploy modal | [ ] |
| 4 | (SR) smoke | [ ] |

**vs main:** Modal typeahead should behave like 1A, not like page-level selects.

### 2B. Model Registry — Autofill connection

| | |
|--|--|
| **Tag** | **CHANGED vs main** |
| **Wrappers** | `SearchSelector` (project) + `ConnectionDropdown` (connection name) |
| **Navigation** | **Model Registry** → registry → **Register model** (or register version) → Model location → **Autofill connection** |
| **Controls** | Project search dropdown; **Connection name** (`data-testid="select-connection"`) |
| **Prerequisite** | MR instance + connection in a project; may need `npm run start` for federated MR |

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Open Autofill from connection modal (`connection-autofill-modal`) | [ ] |
| 2 | Project `SearchSelector` — open, search, select | [ ] |
| 3 | Tab / Escape close project menu, not modal | [ ] |
| 4 | Connection dropdown — open, select | [ ] |
| 5 | Tab / Escape close connection menu, not modal | [ ] |
| 6 | (SR) both controls | [ ] |

**vs main:** Both menus are modal-hosted; expect the Escape/Tab and portal fix vs `main`.

### 2C. Model Registry — Deploy (project selector)

| | |
|--|--|
| **Tag** | **CHANGED vs main** |
| **Wrapper** | `SearchSelector` via `InferenceServiceModal/ProjectSelector` |
| **Navigation** | Model Registry → registered model → version → **Deploy** |
| **Control** | Project selector (`data-testid="deploy-model-project-selector"`) |
| **Also check** | If 2+ matching connections appear, connection typeahead (`ExistingConnectionField`) — **CHANGED vs main** |

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Open Deploy from MR modal | [ ] |
| 2 | Project selector — open, search, select; Tab/Escape | [ ] |
| 3 | Connection typeahead if shown — same checks as 2A | [ ] |

---

## Phase 3 — REGRESSION (shared wrappers; no expected new modal fix)

These use the same components but should **match `main` / post-66822**. Mark failures only if this branch broke them.

### 3A. Workbench spawner — notebook image / version

| | |
|--|--|
| **Tag** | **REGRESSION** |
| **Wrapper** | `SimpleSelect` (page / non-modal spawner) |
| **Navigation** | Workbenches → **Create workbench** |
| **Controls** | Notebook image; Image version |

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Open image + version selects; choose values | [ ] |
| 2 | Keyboard open/select works as on `main` | [ ] |

**Note:** Impacted by shared `SimpleSelect` hook refactor — **expect no behavior change** vs post-66822 `main`.

### 3B. Workbench env var type / data type

| | |
|--|--|
| **Tag** | **REGRESSION** (already fixed in 66822) |
| **Wrapper** | `SimpleSelect` |
| **Navigation** | Create workbench → Environment variables → Add variable |
| **Controls** | Variable type; Data type |

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Open type/data type; select Config Map / Key-value | [ ] |
| 2 | Behavior still matches 66822 (usable in form; no new breakage) | [ ] |

### 3C. Attach existing connections — MultiSelection

| | |
|--|--|
| **Tag** | **REGRESSION** (66822 deliverable — must still hold) |
| **Wrapper** | `MultiSelection` |
| **Navigation** | Create/Edit workbench → Connections → **Attach existing connections** |
| **Control** | Connections multiselect (`id="select-connection"`) |
| **Prerequisite** | Connection from 1A |

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Open modal; filter/select connection | [ ] |
| 2 | Tab closes menu without closing modal (66822 behavior) | [ ] |

### 3D. Pipelines / area project header selector

| | |
|--|--|
| **Tag** | **REGRESSION** |
| **Wrapper** | `SearchSelector` (page header, not modal) |
| **Navigation** | Sidebar → **Pipelines** (or Distributed workloads) — project switcher in page header |

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Open project search; pick a project | [ ] |
| 2 | Behaves like `main` (no modal Escape semantics required) | [ ] |

### 3E. Learning resources toolbar

| | |
|--|--|
| **Tag** | **REGRESSION** |
| **Wrapper** | `SimpleSelect` |
| **Navigation** | Sidebar → **Learning resources** |

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Sort by / Sort order dropdowns | [ ] |

### 3F. Deploy model — framework / runtime (page or wizard selects)

| | |
|--|--|
| **Tag** | **REGRESSION** |
| **Wrapper** | `SimpleSelect` (e.g. `InferenceServiceFrameworkSection`) |
| **Navigation** | Deploy model flow — framework / serving runtime fields |

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Open framework / runtime selects; choose values | [ ] |

**Note:** Impacted wrapper, but **expect no new change** vs post-66822 `main`. Contrast with **2A Existing connection** in the **same** deploy flow, which **is** **CHANGED vs main**.

---

## Phase 4 — Optional admin / edge (smoke)

| ID | Tag | Navigation | Control | Pass? |
|----|-----|------------|---------|-------|
| 4A | **CHANGED vs main** (if modal) | Settings → Model registry → **Create registry** (secure DB section) | `SearchSelector` | [ ] |
| 4B | **CHANGED vs main** | Deploy model (NIM) → storage | Size unit + Storage class | [ ] |
| 4C | **REGRESSION** (66822) | Project → Permissions → Roles → **Add rule** | MultiSelection subjects/resources | [ ] |
| 4D | **REGRESSION** | Settings → Connection types → manage numeric advanced | Typeahead / selects on page | [ ] |

Skip any row if the operator / feature flag is unavailable.

---

## Suggested order (highest value)

1. **1A** Create connection type  
2. **1C** Attach existing storage PVC  
3. **1D / 1E** Size unit + storage class  
4. **2B** MR Autofill (Project + ConnectionDropdown)  
5. **2A / 2C** Deploy existing connection / MR Deploy project  
6. **3C** MultiSelection attach connections (66822 hold)  
7. One non-modal **REGRESSION** each: **3A** + **3D**

---

## Troubleshooting empty dropdowns

| Symptom | Cause | Fix |
|---------|-------|-----|
| Notebook images empty | No ImageStreams | Use a cluster with notebook images |
| Storage class empty | No StorageClasses | Ask admin / use default SC |
| PVC typeahead empty | No PVCs | Complete 1D/1E first |
| Connections empty | No connections | Complete 1A |
| Model Registry missing | Federated module / operator | `npm run start` + MR instance |
| Serving runtime empty | KServe not ready | Check model serving operator |
| Port already in use | Leftover `npm run start`/`dev` | `lsof -i :4000 -i :4010` then kill PIDs |

---

## Manual pass checklist (summary)

```
CHANGED vs main
[ ] 1A Create connection — Connection type (TypeaheadSelect)
[ ] 1A2 Create connection — Access type / DropdownFormField (OCI)
[ ] 1B Create connection from workbench (same)
[ ] 1C Attach existing storage — PVC typeahead
[ ] 1D Create storage — size unit + storage class
[ ] 1E Add cluster storage — size unit + storage class
[ ] 2A Deploy model — Existing connection
[ ] 2B MR Autofill — Project SearchSelector + ConnectionDropdown
[ ] 2C MR Deploy — ProjectSelector (+ connection if shown)

REGRESSION
[ ] 3A Workbench image / version SimpleSelect
[ ] 3B Env var type / data type (66822)
[ ] 3C Attach connections MultiSelection (66822)
[ ] 3D Page header SearchSelector (pipelines)
[ ] 3E Learning resources sorts
[ ] 3F Deploy framework / runtime SimpleSelect

OPTIONAL
[ ] 4A–4D as available
```

---

## Reference

- Prior runbook pattern: `notes/RHOAIENG-66822-manual-select-testing.md` (may be absent in this worktree; structure mirrored here)
- Cypress mocked: `packages/cypress/cypress/tests/mocked/projects/tabs/connections.cy.ts`, `workbench.cy.ts`
- Shared hook: `packages/ui-core/src/utilities/useMenuPopperInModal.ts`
- Branch context: `.cursor/context/current/scope.md`, `notes.md`
