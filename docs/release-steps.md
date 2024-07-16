[base/kustomization.yaml]: ../manifests/core-bases/base/kustomization.yaml
[quay repo]: https://quay.io/repository/opendatahub/odh-dashboard?tab=tags
[drafting a new release]: https://github.com/opendatahub-io/odh-dashboard/releases/new
[semver]: https://semver.org/

# Releases

Releases are done up to two times every three weeks. First Friday is an ODH release, third Friday is a OpenShift AI release. Both are based off the same stream of code and will effectively be an "early" release (for ODH) and the release itself.

Details on how we will do a release are being worked on and will likely update the steps at that time. Until then, we will continue with the same steps we have had before when `incubation` was a concept we pushed.

## ODH Release

> Note: the version number should be the last release number with an increment on the patch version (see [release version](#version-numbers))

* Determine the next version number by taking the last release and adding a z-stream number (eg. for `v1.23.0`, we would be `v1.23.1`)
  * Back to back ODH releases will increment the z value
  * First ODH release after a RHOAI release will take the value from 0 to 1
  * Read more about [release version](#version-numbers) if needed
* Change the `INTERNAL_DASHBOARD_VERSION` var value in ~/frontend/.env file to the release value
* Go to our [quay repo] & "Add New Tag" off of the latest `main` build
  * Create the tag with the `vX.YY.Z-odh` naming convention (eg. `v1.23.1-odh`)
  * Get the latest sha digest value for this release
* Create a branch on the latest of `main` (make sure this matches the same as the sha value you grabbed in the previous step)
  * `vX.YY.Z-odh-release` naming convention
  * Add a comment to this branch, modify the [base/kustomization.yaml] value for `images.odh-dashboard` to specify the sha digest value you grabbed from Quay
* Start [drafting a new release], this release will not make use of the generate release notes feature as we want a high level breakdown.
  * Versioning will match the quay image name you generated in the first step
  * Be sure to disable the `Set as the latest release` setting as we use the stable releases as our latest release

## OpenShift AI Release

* Pick a new [release version](#version-numbers)
  * `vX.YY.Z` based on what is included (eg. `v1.23.4`)
  * If you do not have enough information to make the call on minor or patch version updating, you may need to pick one and wait until the release notes are generated
* Change the `INTERNAL_DASHBOARD_VERSION` var value in ~/frontend/.env file to the release value
  * Create a PR and self lgtm + approve the PR upversion
* Once the version number has been updated -- Start [drafting a new release]
* Set the release title to the same name as the tag
* Click the `Generate release notes` button to get the full list of PRs merged into `main`
  * Scan the notes it generated for any gaps in your Release
  * If you were waiting on full determination of release number, make that call now
    * Verify the tag & the title of the release; these should match
* Add a header section at the top of the readme called `## Notable Changes`
  * Add notes on what can be considered a high level set of changes, don't be too specific on changes and no need to catch every change - just notable ones
  * See previous releases for examples
* Mark the release as the `latest` and submit the release


## Version Numbers

Since this is primarily a frontend repo, versioning will need to be aligned to what we do as a UI application.

We will release when the ODH Dashboard...
- has meaningful content merged since last release
- is in a stable state
- is requested to be released as a ready-state for downstream / other components

Version naming is done in a [semver] structure `vMajor.Minor.Patch`
- Increment `Major` if we have...
  - taken the code in a major architecturally different direction and could have side effects for features
- Increment `Minor` if we have...
  - made a notable existing feature change
  - a new feature being advertised to be turned on
  - a new feature in alpha state (advertise-able but may not be fully feature complete or completely stable)
- Increment `Patch` if we have...
  - general bug fixes
  - internal refactors (that do not change the feature set)
  - new features that are not ready to be turned on (*must* be fully behind a feature flag)
- Note: We try to follow [semver] based on the above information, so if incrementing...
  - `Major`, set `Minor` and `Patch` to `0`
  - `Minor`, set `Patch` to `0` & leave `Major` as the last value
  - `Patch`, leave `Major` and `Minor` at the last value
