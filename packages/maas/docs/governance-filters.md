# MaaS Governance Filtering and the Groups View

How to filter resources on the MaaS governance Overview tab and how the Groups view
aggregates them.

## Selecting a resource vs. filtering by text

Every filter on the Overview, Subscriptions, and Authorization policies tabs is a
typeahead menu with two ways to filter:

- **Exact selection.** Pick a listed resource (model, project, group, subscription,
  or authorization policy) from the menu. The filter matches that resource
  identifier exactly. For models, selecting a model name matches every project
  that registered that model.
- **Committed text fragment.** Type a partial text fragment (for example `7B`) and
  commit it through the `Filter by "<text>"` option at the top of the menu. The
  filter matches every row whose relevant names, display names, or descriptions
  contain that fragment (case-insensitive).

A selection and a fragment with the same text behave differently: a selection
matches one resource exactly, while a fragment matches anything containing the
text. Clear a filter with the clear button in its chip, or clear all filters from
the toolbar.

## The Groups view

The Overview toggle switches between two views:

- **Models** lists every registered model with its project, status,
  subscriptions, and authorization policies.
- **Groups** aggregates the same resources by group. Each group row expands to
  show its subscriptions and authorization policies, including per-model token
  limits where the subscription defines them.

Both views share the same filters. Creating a subscription or authorization
policy from the toolbar returns to the view you started from. The `view=groups`
URL parameter persists the Groups view, so links can target it directly.
