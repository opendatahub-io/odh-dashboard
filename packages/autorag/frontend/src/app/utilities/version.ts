// Pipeline versions follow semver with "-ea.N" pre-release tags for early access:
//   autorag-3.5.0       → GA release 3.5.0
//   autorag-3.5.0-ea.1  → early access build 1 of 3.5.0
//
// Per semver, pre-release versions sort BEFORE their GA counterpart:
//   3.5.0-ea.1 < 3.5.0-ea.2 < 3.5.0 (GA)
//
// This means isVersionAtLeast('3.5.0-ea.1', '3.5.0') returns FALSE.
// To gate a feature for ea releases, check against the prior GA version:
//   isVersionAtLeast(version, '3.4.0')  // includes 3.5.0-ea.1+
import { compare, validate } from 'compare-versions';

const SEMVER_PATTERN = /(\d+\.\d+\.\d+(?:-.+)?)/;

export const parsePipelineVersion = (versionName: string | undefined): string | undefined => {
  if (!versionName) {
    return undefined;
  }
  const match = versionName.match(SEMVER_PATTERN);
  const version = match?.[1];
  return version && validate(version) ? version : undefined;
};

export const isVersionAtLeast = (version: string | undefined, minVersion: string): boolean => {
  if (!version) {
    return false;
  }
  return compare(version, minVersion, '>=');
};
