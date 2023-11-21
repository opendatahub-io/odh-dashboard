[triage]: triage.md
[branches]: branches.md
[stable branch]: branches.md#main
[feature flow]: flow-feature.md
[incubation flow]: incubation.md
[Advisors]: advisors.md
[templates]: https://github.com/opendatahub-io/odh-dashboard/issues/new/choose

# Standard Issue Flow

This is the flow most issues will go through. Did you find a bug? Want a new feature? Maybe an addition to an existing feature? These will make easy flows to follow.

> Note: We will often times look at [minor vs larger features](#minor-vs-larger-features) and adjust created issues as we see fit. This isn't needed to be thought of beforehand, just insight.

![standardFlow.png](meta%2FstandardFlow.png)

Notes:

- Issues are created through our [templates] and then waits for the [triage] team
- Once we review the issue, if UX is needed the flow switches into the UX flow and waits for that to finish the needed design efforts before we can continue
  - Once UX is done, the flow sits in a `Dev Ready` status awaiting the [Advisors] to review the results and hand it off to the Dev team
- Eventually or if it doesn't need UX the flow will fall into the `Dev To Do` bucket, and we'll pick it up organically based on availability and priority and set into `Dev In Progress`
- Once the solution has been applied, the following runs out the process:
  - A PR will be created reviewed by maintainers of ODH Dashboard
  - [Advisors] will also review and be in charge of approving the solution
  - The merge bot then will merge the PR into `main` (see more about [branches]) which will auto-close the issue

## Minor vs Larger Features

Features come in all sizes and can be sometimes problematic to the stability of the Dashboard. To avoid instability in our [stable branch] (`main`) we will often send the request through our [feature flow]. This will make the solution pass through our [incubation flow]. It is slower, but has a greater chance of applying the right solution before we merge it into `main`. ODH will get the feature for awhile while we verify the solution and stability of the flows.
