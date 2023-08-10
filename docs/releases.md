# Releases

Releases in ODH Dashboard are done when needed. We release typically every 3 weeks, but we hope to move to a weekly release schedule on Fridays.

## Determining Release Content

As an open-source application contributing (see our [CONTRIBUTING.md](../CONTRIBUTING.md)) is available to anyone who would like to participate in asking for features, reporting issues, and even in contributing fixes for them.

We work hard to provide an application that is applicable on its own and customizable for downstream consumers. This usually leads us to creating features and addressing bugs that are reported outside our repo and brought into it from the outside source. This does not mean we don't intend to support open-source requests for features and bug fixes as they come up.

Determining the content is often based on importance and ease to integrate new features and bug fixes into the on-going growth of our application. There isn't a clear order to what we address each release but the goal is to create `Current Release` Milestones (see our [Milestone page](https://github.com/opendatahub-io/odh-dashboard/milestones) for active goals). If you do not see your issue within' this milestone, you'll likely not make it into the next release (which should be dated on each milestone). You however can request it on your issue if you see an importance or need for it.

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
- [Milestone list](https://github.com/opendatahub-io/odh-dashboard/milestones) & select the `Current Release` Milestone

Once we reach a date in which we want to do a release (see other sections for more information), we'll want to do the following:

1. Set up the Release notes from the **Release page**
   - First start by drafting a new release (button should be in the top right of the page, baring permissions)
   - Choose a tag at the top of the forum -- if you have already created a tag, select it, if not type a new version that matches the current Release (eg. `v1.2.3`)
   - Set the release title to the same name as the tag
   - Click the `Generate release notes` button
   - Scan the notes it generated for any gaps in your Release
     - Match it up with the `Current Release` milestone (see the **Milestone list**) and verify it has all the needed items
   - Add a section at the top of the readme called `Notable Changes`
     - Add notes on what can be considered a high level set of changes, don't be too specific on changes and no need to catch every change -- just notable ones
     - See previous releases for examples
   - Keep this page open as you proceed through the next steps -- if you have to stop at any point mark this release as a `draft` so you can return to it in the future
2. Make sure the `Current Release` Milestone is ready to go (see the **Milestone list**)
   - If the contents of the Milestone are all merged, we are ready, move to step 3
   - If the contents of the Milestone are not all merged, determine if we need any of those items in this release
     - If not, move them out to a new Milestone or remove them completely from the Milestone
     - If yes, merge the content as needed and then restart the release steps
3. Rename the Milestone to the next release (eg. `v1.2.3`) & mark the Milestone closed 
4. Update the `Upcoming Release` milestone name and description
   - Rename it to `Current Release` as to align with the next set of work we are working on
   - Set the description note the current release will be after the version we just renamed to help tie the two together. Eg. "Follows up `v1.2.3`" 
5. Create a new `Upcoming Release` milestone, so we can plan two releases out
   - Set the date of the new Milestone out 3 weeks from the last release (we may release earlier, but we try not to release later) -- if this changes we will update the information in the related milestones
   - Set the description to note that it will follow the `Current Release` so that it's more dynamic and less tied to a release number
6. Mark the Release notes document you have as a full release and publish it
7. Update the ODH Manifest with the release details so the Operator can collect our latest changes on release
   - Navigate to the [odh-manifests](https://github.com/opendatahub-io/odh-manifests)
   - Focusing on the `odh-dashboard` folder, we'll need to copy some files over to track the latest changes of this release
   - Test the latest version of the quay image ([our quay repo](https://quay.io/repository/opendatahub/odh-dashboard?tab=tags)) on a cluster to make sure the pods can come up and the Dashboard is accessible
   - Create a PR to include the following:
      - First delete everything in the folder -- git will do the diff of what changed for us
      - Copy all the child folders in the [manifest folder](../manifests)
         - Exclude the `overlays` folder as this is for internal testing purposes
      - Copy the OWNERS file into the root of the odh-dashboard manifest folder
      - Update the `./base/kustomization.yaml` so that the `odh-dashboard` images section has the `newTag` equal to the current release version (aka the tag we created earlier)
      - Update the top row of the component versions table on the root readme to have the latest release version (aka the tag we created earlier)
