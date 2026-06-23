# RHOAIENG-66822 — Scope freeze and manual verification

## Scope lock

This PR is scoped to RHOAIENG-66822 acceptance criteria only:

1. Screen reader users can navigate, announce, and select items in the **Attach existing connections** dropdown (`MultiSelection` in modal).
2. Screen reader users can navigate, announce, and select the **environment variable type** (`SimpleSelect` with proper labeling).
3. Dropdowns follow ARIA combobox/listbox patterns with proper roles, states, and keyboard interaction.
4. Unit and Cypress tests updated for intentional behavior changes.

Further component changes outside this scope require a new ticket.

## Intentional behavior changes

- **MultiSelection in modals:** dropdown menu portals into the nearest `[role="dialog"]`; modal `overflow` is unlocked while open.
- **SimpleSelect labeling:** when `toggleProps.id` matches a visible label (e.g. FormGroup `fieldId`), the toggle no longer uses generic `aria-label="Options menu"`.
- **SimpleSelect portal:** only applies inside modals; non-modal selects remain inline (or use caller `popperProps.appendTo`).
- **Cypress:** page objects query `"Variable type"` / `"Data type"` instead of `"Options menu"` where labels apply.

## Manual screen reader verification checklist

Test on Windows 11 with JAWS or NVDA (or VoiceOver on macOS as a smoke check):

### Attach existing connections

- [ ] Open workbench spawner → Connections → Attach existing connections modal
- [ ] Tab to the Connections combobox; screen reader announces "Connections"
- [ ] Arrow Down moves through connection options; each option is announced
- [ ] Enter or Space selects an option
- [ ] Escape closes the menu

### Environment variable type

- [ ] Open workbench spawner → Environment variables → Add variable
- [ ] Tab to Variable type; screen reader announces "Variable type" (not "Options menu")
- [ ] Open the list; options (Config Map, Secret, etc.) are announced
- [ ] Select an option; selection is announced
- [ ] Repeat for Data type sub-select after choosing a variable type

## Out of scope (deferred)

- Global portal changes for all `SimpleSelect` / `TypeaheadSelect` instances outside modals
- Additional edge-case unit tests beyond AC coverage
