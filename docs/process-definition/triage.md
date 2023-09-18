[larger flow]: flow-feature.md
[standard issue flow]: flow-standard.md
[Dev issues]: https://github.com/orgs/opendatahub-io/projects/24/views/1
[opendatahub-community general issues]: https://github.com/opendatahub-io/opendatahub-community/issues?q=is%3Aissue+is%3Aopen+-label%3Atracker+

<!-- is:issue is:open -label:"feature/adminui",(other labels)  -->
<!-- To update, copy all labels and wrap in quotes and prefix with "-label:" -->
[feature label]: https://github.com/opendatahub-io/odh-dashboard/issues?q=is%3Aissue+is%3Aopen+-label%3A%22feature%2Fadminui%22%2C%22feature%2Fcnbi%22%2C%22feature%2Fbyon%22%2C%22feature%2Fhabana%22%2C%22feature%2Fmodel-serving%22%2C%22feature%2Fdep-detection%22%2C%22feature%2Fstorage-classes%22%2C%22feature%2Fmodel-registry%22%2C%22feature%2Fexplainability%22%2C%22feature%2Fnotebook-controller%22%2C%22feature%2Fds-pipelines%22%2C%22feature%2Fds-projects%22%2C%22feature%2Fns-migration%22%2C%22feature%2Faccelerator-support%22%2C%22feature%2Foperator-rework%22%2C%22infrastructure%22%2C

# Triage

## Triage Team

The triage team consists of all the developers associated to the Dashboard. We triage an `Untriaged` issues and determine if it needs UX, if it's a part of a [larger flow] or if it's following the [standard issue flow].

## Triage Steps

1. Locate all the `Untriaged` issues in the first column of the [Dev Issues] tab, for each issue, do the following items in order:
   * Determine the future it belongs to
     * Mark with as many `feature/*` labels as needed
     * If no feature, set to `infrastructure`
   * Does the ticket have a valid [priority](#determining-priority)?
     * If not, add `priorty/normal` or a more specific priority
     * If yes, is this the right priority for the issue?
   * Do we have enough to understand the goal of the ticket?
     * No?
       * Request more from the Author - add `needs-info` label
       * Set to `Dev To Do` & **move on to the next issue**
   * Does it have a clear UX solution?
     * No?
       * Set to `UX Backlog`
       * Add a comment why we need the UX assistance
     * Yes: Set to `Dev To Do`
2. Check on the [opendatahub-community general issues]
   * We are looking for anything Dashboard related
     * Move to Dashboard repo if we find one & repeat steps from no1
3. Make sure everything has a [feature label]

### Determining Priority

* `priority/blocker` - This is a critical flow, the next release cannot go out without this fixed
* `priority/high` - This is highly important, let us fix this asap; it either is a critical break or a highly undesired flow
* `priority/normal` - Standard issue priority, we'll get to it asap
* `priority/low` - Not something we should prioritize, might get done if someone has a break in the flow
