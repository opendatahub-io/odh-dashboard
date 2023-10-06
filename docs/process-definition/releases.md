[release-steps]: ../release-steps.md
[incubation]: incubation.md
[Release Notes]: https://github.com/opendatahub-io/odh-dashboard/releases

# Release Documentation

This describes how and why we do releases. To do an actual release, you'll want to read the [release-steps].

![branchesComplex.png](meta%2FbranchesComplex.png)

This diagram showcases the flow between features & incubation. It ends with the git tags we use to denote releases.

## Git Tags & Release Notes

Our release git tags are showcased as [Release Notes] on the release page.

There are two types of releases:

1. [Main & Stable releases](#release-of-main) - these are denoted by `vX.YY.Z`
2. [Incubation releases](#release-of-incubation) - these are denoted in two ways:
   1. Typically following a `main` release `vX.YY.Z-incubation`
   2. Adhoc (unofficial) release `incubation-YYYY-MM-DD` - these releases are infrequent and are not an up-to-date representation of our stable branch, these do not get release notes

## Official Release Types

### Release of `main`

Every 3 weeks we release on a Friday. This is useful for any downstream products (like RHODS) to use our stable code.

ODH & other "bleeding edge" implementations may want to consider using `incubation`. Read more on [incubation].

### Release of `incubation`

We take the contents of the `main` release and merge it into `incubation` and fork a branch. This allows us to continue to provide the latest stable fixes along with all that we have in [incubation].

> Note: The rare unofficial & adhoc `incubation` release is often for a particular customer and aimed around a feature branch. These adhoc releases are not guaranteed for long term release stability. The next official `incubation` release will close this gap.
