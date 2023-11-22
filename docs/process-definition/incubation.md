[branches]: branches.md
[branches stable]: branches.md#how-to-determine-it-is-stable
[incubation releases]: releases.md#release-of-incubation
[triage]: triage.md
[tracker]: https://github.com/opendatahub-io/odh-dashboard/issues?q=is%3Aopen+is%3Aissue+label%3Atracker
[templates]: https://github.com/opendatahub-io/odh-dashboard/issues/new/choose

# Incubation

Incubation is a term we use for flows that are not quite fully stable. They have been worked on by the developers and have yielded a flow that may not have all the edge cases figured out, or simply may just not be fully vetted for the flow. Essentially, we are looking for feedback on how the functionality works and if you find any use-cases you might be experiencing that does not quite work with the incubated features.

## Branching Strategy

There is a lot to discuss here, more detailed information can be found in the [branches] readme, but simply put, the flow follows this pattern:

![branchesBasic.png](meta%2FbranchesBasic.png)

- Features are created off the state of `main`
- Code is added to the feature branches through PRs
- The feature branches merge into `incubation` when they are ready
- The feature branches get updates through testing / incubation efforts and merge these new changes into `incubation`
- When they are finished incubation, signed off on by quality teams, business units, they merge back to `main` and become part of the stable product

> Note; This process is simplified for the discussion of incubation, more details can be found on the [incubation releases] & [branches] readmes.

## Branch Stability

In a nutshell:

- `main` - stable
- `incubation` - semi-stable
- feature branches - not reliably stable

### `main` Stability

`main` should strive to always be stable and avoiding of regressions. Naturally this is easier said than done, but we are continually improving the process to make this more reality than goal. With the help of `incubation`, this is easier today than it was in the past.

### `incubation` Stability

Incubation strives to be as stable as `main` but it suffers from multiple streams colliding (see [branches] for more info on this). A break in `incubation` is still very important as it is what we release to the ODH community. How we approach this can be found more in the [addressing issues](#addressing-issues) section

As feature branches merge into `incubation`, this is when stability becomes far more important. Read more on how we consider [branches stable].

## Addressing issues

### Trackers evolve with the changes in incubation

We'll look to improve our [trackers] list of items as we fix issues and address concerns to help track the effort for future reflection. This is not required if you are reporting an issue, the [triage] team will handle this.

### Reporting Issues

This can be in the form of a bug or a request for an addition to the feature incubating. Both of these flows can be found in our [templates].

Logging notes:

- Report as many as you want / per idea
  - Avoid double downing on an issue, but if easier, we can split them at [triage]
- Bug report issue flow has an option for you to say ODH release or incubation branch if you want
- Feature Requests do not - but that's okay, effectively you're still asking for "something", just detail out your request

### Developer Investigation Of Issues

Incubation will have issues occasionally despite best efforts to avoid this. Here is some known flows how we will address this.

1. Track the source of the issue
    * Was it from `main` merging in and not being compatible with the state of `incubation`?
    * Was this from a feature branch?
    * Could this not be from any source and was a failure of merge conflicts?
2. Once the issue is traced, we have some paths forward
    * From `main`? This is critical - we need to address this asap for [main stability](#main-stability)
    * From a feature branch? Fix it there, merge back into `incubation` when ready
    * From a merge conflict resolution? (TODO)
