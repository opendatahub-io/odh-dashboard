# Releases

Releases in ODH Dashboard are done when needed. We release typically every 3 weeks, but we hope to move to a weekly release schedule on Fridays.

## Determining Release Content

As an open-source application contributing (see our [CONTRIBUTING.md](../CONTRIBUTING.md)) is available to anyone who would like to participate in asking for features, reporting issues, and even in contributing fixes for them.

We work hard to provide an application that is applicable on its own and customizable for downstream consumers. This usually leads us to creating features and addressing bugs that are reported outside our repo and brought into it from the outside source. This does not mean we don't intend to support open-source requests for features and bug fixes as they come up.

Determining the content is often based on importance and ease to integrate new features and bug fixes into the on-going growth of our application. There isn't a clear order to what we address each release but the goal is to create `Next Release` Milestones (see our [Milestone page](https://github.com/opendatahub-io/odh-dashboard/milestones) for active goals). If you do not see your issue within' this milestone, you'll likely not make it into the next release (which should be dated on each milestone). You however can request it on your issue if you see an importance or need for it.

## Version Numbers

Since this is primarily a frontend repo, versioning will need to be aligned to what we do as a UI application.

We will release when the ODH Dashboard...
- has meaningful content merged since last release
- is in a stable state
- is requested to be released as a ready-state for downstream / other components

Version naming is done in a [semver](https://semver.org/) structure `vMajor.Minor.Patch`
- Increment `Major` if we have...
  - taken the code in a major architecturally different direction and could have side-effects for features
- Increment `Minor` if we have...
  - made a notable existing feature change
  - a new feature being advertised to be turned on
  - a new feature in alpha state (advertise-able but may not be fully feature complete or completely stable)
- Increment `Patch` if we have...
  - general bug fixes
  - internal refactors (that do not change the feature set)
  - new features that are not ready to be turned on (*must* be fully behind a feature flag)
- Note: We try to follow [semver](https://semver.org/) based on the above information, so if incrementing...
  - `Major`, set `Minor` and `Patch` to `0`
  - `Minor`, set `Patch` to `0` & leave `Major` as the last value
  - `Patch`, leave `Major` and `Minor` at the last value

## Release Steps

Releases have multiple steps, this documentation here is so we can be aligned on what we need to do and stay consistent between releases.

Before getting started, you'll want to open two more tabs to these pages:
- [Release page](https://github.com/opendatahub-io/odh-dashboard/releases)
- [Milestone list](https://github.com/opendatahub-io/odh-dashboard/milestones) & select the `Next Release` Milestone

Once we reach a date in which we want to do a release (see other sections for more information), we'll want to do the following:

1. Set up the Release notes from the **Release page**
   - First start by drafting a new release (button should be in the top right of the page, baring permissions)
   - Choose a tag at the top of the forum -- if you have already created a tag, select it, if not type a new version that matches the next release (eg. `v1.2.3`)
   - Set the release title to the same name as the tag
   - Click the `Generate release notes` button
   - Scan the notes it generated for any gaps in your Release
     - Match it up with the `Next Release` milestone (see the **Milestone list**) and verify it has all the needed items
   - Add a section at the top of the readme called `Notable Changes`
     - Add notes on what can be considered a high level set of changes, don't be too specific on changes and no need to catch every change -- just notable ones
     - See previous releases for examples
   - Keep this page open as you proceed through the next steps -- if you have to stop at any point mark this release as a `draft` so you can return to it in the future
2. Make sure the `Next Release` Milestone is ready to go (see the **Milestone list**)
   - If the contents of the Milestone are all merged, we are ready, move to step 3
   - If the contents of the Milestone are not all merged, determine if we need any of those items in this release
     - If not, move them out to a new Milestone or remove them completely from the Milestone
     - If yes, merge the content as needed and then restart the release steps
3. Rename the Milestone to the next release (eg. `v1.2.3`) & mark the Milestone closed 
4. Create a new `Next Release` milestone, so we can start building up the next release
   - Set the date of the new Milestone out 3 weeks from the last release (we may release earlier, but we try not to release later)
   - Feel free to note in the description the next release will be either the next Patch version or the next Minor version as a hint to where we are going
5. Mark the Release notes document you have as a full release and publish it
6. Go to our [quay.io repo odh-dashboard](https://quay.io/repository/opendatahub/odh-dashboard?tab=tags)
   - Assuming allowed permissions - if not, inform the ODH Dashboard admins of this gap
   - Using the cog wheel on the right, create a tag off of the latest `main-#####` tagged image (note, check on your commit tied to your release to determine the right one)
   - Type in the name of your release, and submit -- this will create a downloadable image for this release 
