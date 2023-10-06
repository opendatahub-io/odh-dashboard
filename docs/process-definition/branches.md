[test infrastructure]: ../architecture.md#testing-infrastructure
[release documentation]: releases.md
[incubation]: incubation.md
[bugs and small feature requests]: flow-standard.md
[Dashboard Advisors]: advisors.md
[tracker]: https://github.com/opendatahub-io/odh-dashboard/issues?q=is%3Aopen+is%3Aissue+label%3Atracker

# Branches

There are really two types of branches.

- Fork Branch
  - When you create a fork of our repo, these are the branches you push to your fork (often times called `origin`)
  - These are often the source of PRs (with a few exceptions, see below)
- Upstream Branch
  - Feature branches
  - Core branches (like `main` and `incubation`)
  - [Bot branches](#bot-branches)

Every _new_ commit needs to come from a fork through a PR. We don't allow for pushing new content directly through our flows. New docs file, new code change, and even fixing a typo needs a PR from your fork to get into our repository.

With that said, there are really 3 types of flows that utilize both fork branches and Upstream branches.

![branchesComplex.png](meta%2FbranchesComplex.png)

Notes:

- `main` this is our base branch, all code stems from here
- `incubation` this is our "bleeding edge" of our feature set, this came from `main` but [cannot ever return to it](#never-returns-to-main)
- Feature branches are the main other flow, they start from `main` and will eventually return to `main` - often times with a stay in `incubation`

There is only ever 1 `main` and 1 `incubation` branch. Feature branches start with `f/`, and can be as many as needed.

Read more on git tags & releases in our [release documentation].

## Main

> aka "The Stable Branch"

`main` is our most stable and tested code. This flow should be as stable as we are today. We look to only push [bugs and small feature requests] into this branch. Everything else goes to [feature branches](#feature-branches), so it can make it into `incubation` and get closer to stability before merging into `main`.

When a feature branch merges into `main` it can be officially considered _done_ and up to our standards for stable.

## Incubation

> Note: This branch is an amalgamation of several feature branches, source code here is often struggling to co-exist among the features. Conflicts are normal when merging into it.

This branch has a unique flow to it. We have documented more about it in the [incubation] readme.

This branch holds the most bleeding edge of our code. All our features completed to this point are in this branch. This branch is what we take to ODH releases and encourage testing on to help build the best flows we can have. Internal nightly builds consist of this branch too.

`main` is often merged into this branch to keep it updated with the stable fixes.

### Never returns to main

Once the second feature merged into `incubation` it was not likely to ever see a merge back into `main`. As it is unlikely for `incubation` to be so close to `main` that it can directly sync back into it. If we do merge `incubation` into `main` it would take all the features not ready for a stable release and put them in it. This would be counter productive to this system of incubation.

## Feature Branches

> Note: Always prefix your feature branch with `f/`. This helps with organization and showcases it is a feature branch.

Feature branches have two main criteria:

- A [tracker] issue backs it, notes its relationship, and the contents within
- A set of related issues; sometimes it is a singular goal
  - Determining what goes into each feature branch is handled by the [Dashboard Advisors]

### How to determine it is stable

This is a two step process - understanding Stability & Completing the Checklist.

#### What does it mean to be stable?

Breaking code is never the goal - but feature branches are there for that very specific reason. You isolate your code to work on something. At any given state on a feature branch the code could: not work, work but cause issues, have bugs that if a certain flow is followed it will crash the UI. Feature branches live and breathe with the feature and often times need that flexibility to build up brand-new flows or to adjust from previous ones.

Stable code has been tested and proven to support the majority of flows and situations.

The feature is considered stable when it matches the [stability checklist](#stability-checklist).

#### Stability Checklist

It needs to follow the following criteria:

- [ ] Tested by QE + major bugs are fixed
- [ ] Tested by BU + flows are uninterrupted & improved by the change
- [ ] Has tests associated to the effort (does not need to be 100%)
  - QE has a test layer (this is extra)
  - We have [test infrastructure] that needs to be in place
- [ ] [Dashboard Advisors] need to sign off and do the merge to `main`

## Bot Branches

These are our dependabot branches. They are extra branches not described in the diagram above. Essentially they are created in the upstream repo and merges into `main`.

Each branch and subsequent related PR are informing of us a dependency upgrade among the wider open community. We use these PRs to make sure we are not falling too far behind on our dependency versions.
