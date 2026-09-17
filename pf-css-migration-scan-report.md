# PatternFly CSS Migration Scan

**Generated:** 2026-09-17  
**Scan path:** `frontend/src`, `packages`, `distributions`

## Findings

The scan found legacy PatternFly class and token references. These require review; no automatic fixes were applied.

### Legacy classes

- `packages/feature-store/src/screens/metrics/PopularTags.tsx:65` — `pf-u-ps-sm`; replace with the PF6 utility equivalent.
- `packages/model-training/src/global/trainingJobList/TrainJobTableRow.tsx:168` — `pf-u-p-0 pf-u-color-200`; replace with PF6 utilities or component props.
- `frontend/src/components/DashboardDatePicker.scss:1` — `pf-c-date-picker__helper-text`; replace with PF6 component styling.
- `frontend/src/components/lineage/useLineagePopover.ts:409,411` — `.pf-c-popover` and `.pf-v5-c-popover`; update selector logic to the PF6 popover structure.
- Several Cypress page objects use `.pf-v5-c-brand`; upstream code contains additional legacy selectors.

### Legacy tokens

Examples include:

- `frontend/src/components/lineage/edge/StraightEndTerminal.tsx:70` — `--pf-global--Color--100`
- `frontend/src/pages/modelServing/screens/projects/nim/NIMServiceModal/NIMPVCSelector.tsx:158,189` — `--pf-global--link--Color`
- `packages/ui-core/src/table/TableBase.tsx:316` — `--pf-global--spacer--2xl`
- `packages/model-registry/src/modelCatalog/ValidatedModelsBanner.tsx:40` — `--pf-v6-global--spacer--md`

## Confidence

- High: direct legacy class references.
- Medium: legacy tokens that may be intentionally retained by upstream compatibility code.

## RC update status

The release-candidate update was not applied; the PR targets released PatternFly `6.6.1` packages.
