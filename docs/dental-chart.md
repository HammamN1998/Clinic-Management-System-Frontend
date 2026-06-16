# Dental chart (odontogram)

This document summarizes the **Dental Chart** feature added to ClinicWell (Clinic Management System Frontend). It is a dedicated page where dentists manage a patient's teeth: per-tooth conditions, treatments, and multi-tooth bridges, shown on an interactive odontogram with a side details panel.

The feature is currently labelled **BETA**.

---

## Summary of what was built

| Area | Change |
|------|--------|
| Page | New lazy-loaded page at `/admin/patients/dental-chart` with a vertical split: odontogram (left) + details panel (right) |
| Notation | Universal / FDI / Palmer numbering, selectable on the page; doctor's last choice saved as preferred |
| Odontogram | Existing SVG teeth diagrams reused in a new "chart mode" via a shared base directive |
| Conditions | Color swatches set a tooth's condition; the fill reflects the condition color |
| Treatments | Per-tooth treatment list with add/edit/status/delete; each treatment shown as a draggable SVG badge card connected to its tooth by a leader line |
| Bridges | Multi-tooth (adjacent) treatments rendered as a bar spanning the teeth, with an editor |
| Selection | Shown by a **dark-red border** only (no fill), for selected tooth, bridge members, and bridge draft |
| Details panel | Close (X) with unsaved-changes guard; click-to-edit cards; auto-saving tooth note |
| i18n | English + Arabic, RTL-aware layout |

---

## 1. Entry point

From the **patient profile** (`patient-profile.component`), the *Specialized forms* section has a single **Open dental chart** button (with a `BETA` badge) above the *Available Diagrams* list.

- `openDentalChart(notation?)` navigates to the chart page. An optional notation can be passed via router state; otherwise the page falls back to the doctor's preferred notation.

---

## 2. Page layout & state

`dental-chart.component.ts` owns the interaction state and snapshots the chart into fresh references so the diagram re-renders on change.

- **Notation:** read from `history.state.notation` (from the profile button) or `DentalChartService.getPreferredNotation()`. A small, compact selector on the opposite edge of the controls row lets the doctor switch; changing it persists the preferred notation.
- **Controls row (`panel-controls`):** holds the **New bridge** button and the notation selector; separated from the panel by a divider. While creating/editing a bridge it becomes a highlighted active banner with a **Cancel** action.
- **Selection model:** `selectedToothId`, `selectedBridgeId`, `highlightedTreatmentId`, plus a `bridgeDraft` buffer and `mode` (`normal` | `bridge`).
- **Snapshots:** `toothStates` and `spanningTreatments` are re-copied on every change (`snapshot()`), and Escape cancels bridge mode.

---

## 3. Odontogram rendering

The three diagram components (`fdi`, `universal`, `palmer`) extend a shared abstract base, `OdontogramDiagramBase`, supporting two modes:

- **Legacy note mode** (patient profile) — unchanged: click a tooth, edit a free-text note (red fill when noted).
- **Chart mode** (this feature) — condition-colored fills, draggable per-tooth **badge cards**, and **bridge bars**.

Key rendering details:

- The SVG `viewBox` is widened by `GUTTER` on each side to hold badge cards; the teeth image fills the middle. `overflow: visible` lets dragged cards/connectors render outside the box.
- Badge cards auto-place next to their tooth (vertically centered, nudged down to avoid overlap), connected by a single leader line. A dragged position is persisted (`badgePos`) and wins over auto-layout.
- Badge anchors come from each tooth path's `getBBox()`.
- Card width / gutter (`CARD_W`, `GUTTER`) are tuned so larger badge text fits without overlapping the teeth.
- **Selection is a border, not a fill:** `isSelected()` returns true for the selected tooth, the members of the selected bridge, and the bridge-draft teeth; `path.selected` draws a dark-red (`#8B0000`) border so the condition color stays visible.
- All SVG `<text>` is non-selectable.

---

## 4. Details panel (`tooth-detail-panel`)

A presentational component with two faces driven by `bridgeMode`. All persistence goes through `DentalChartService`; it emits `changed` so the page re-snapshots.

### Close (X)
- An **X** in the top **end** corner (right in LTR, left in RTL) closes the panel.
- `requestClose()` checks `hasUnsavedChanges()`; if dirty it opens a confirm dialog whose action reads **Discard** (`COMMON.DISCARD`) and only closes on confirm.
- "Dirty" is computed against the saved data: the note differs, an edited treatment/bridge field changed, or a new treatment/bridge is being composed. Merely viewing/selecting a treatment is **not** dirty.

### Tooth mode
- **Condition swatches** set the tooth condition (and color); shows a "Saved" toast.
- **Tooth note** autosaves on blur (only when changed) and shows the same "Saved" toast.
- **Treatment form:** Operation, then **Date + Status on one row**, then Note. Add/Update.
- **Treatment list:** click **anywhere on a card** to highlight + edit it (the status toggle and delete button are excluded). The same highlight/edit happens when the treatment's badge row is clicked in the diagram (`highlightedTreatmentId`).

### Bridge mode
- A highlighted "New/Edit bridge" editor showing selected-teeth chips and a live count, with the same **Date + Status row** layout.
- **Existing bridges list:** click **anywhere on a card** to edit it (delete excluded), mirroring the treatment cards.
- Cancel lives in the page-level controls banner (not inside the panel).

---

## 5. Data model & service

`patient.model.ts` defines the chart types; the chart is stored per patient and keyed by notation.

- `DentalNotation = 'fdi' | 'universal' | 'palmer'`
- `ToothChartState` — `condition`, `color`, `note`, `treatments[]`, optional `badgePos`
- `ToothTreatmentStep` — `operation`, `date` (ISO `yyyy-mm-dd`), `status`, optional `note` (no cost field)
- `SpanTreatment` — a bridge: ordered adjacent `toothIds`, `operation`, `date`, `status`, optional `note`
- `NotationDentalChart` / `DentalChart` — `{ teeth, spanningTreatments }` per notation
- `User.preferredDentalNotation` — the doctor's saved default notation

`dental-chart.service.ts` handles all reads/writes (preferred notation, tooth condition/note/badge position, add/update/delete treatments and bridges) and persists through `PatientService.updatePatient`. Helpers in `dental.constants.ts` provide condition/operation options, tooth sequences and adjacency (`canExtendBridge`, `orderAdjacentTeeth`), labels, and an operation→condition auto-mapping so marking certain treatments "done" updates the tooth's condition color.

Dates are kept as local ISO day strings; the panel converts to/from `Date` for the Material datepicker to avoid timezone shifts.

---

## 6. Internationalization

- Keys under `PATIENTS.DENTAL_CHART.*` (titles, conditions, operations, statuses, bridge hints, messages) in `en.json` and `ar.json`.
- Added shared keys: `COMMON.DISCARD`, `PATIENTS.DENTAL_CHART.MESSAGES.UNSAVED_CONFIRM`.
- The odontogram SVG is forced `dir="ltr"`, while controls (notation selector, close X) use logical CSS properties (`margin-inline-start`, `inset-inline-end`) to align correctly in Arabic (RTL).

---

## 7. Key files

| File | Purpose |
|------|---------|
| `src/app/admin/patients/dental-chart/dental-chart.component.*` | The page (layout, selection, bridge flow, notation) |
| `src/app/shared/components/dentist/odontogram-diagram.base.ts` | Shared dual-mode diagram logic (styles, selection, badges, bridges) |
| `src/app/shared/components/dentist/{fdi,universal,palmer}-teeth-diagram/*` | The three notation diagrams + chart-mode styles |
| `src/app/shared/components/dentist/tooth-detail-panel/*` | The right-hand details panel |
| `src/app/core/models/patient.model.ts` | Dental chart data types |
| `src/app/core/models/dental.constants.ts` | Conditions, operations, notations, tooth sequences, helpers |
| `src/app/core/service/dental-chart.service.ts` | Chart persistence + preferences |
| `src/app/admin/patients/patient-profile/patient-profile.component.*` | "Open dental chart" entry point |
| `src/assets/i18n/{en,ar}.json` | Translations |

---

## 8. Reusable change outside the feature

`DeleteConfirmDialogService.open(message, confirmLabel?)` gained an optional confirm-button label (defaults to `COMMON.DELETE`), so the same dialog can show **Discard** for the unsaved-changes prompt without affecting other delete confirmations.
