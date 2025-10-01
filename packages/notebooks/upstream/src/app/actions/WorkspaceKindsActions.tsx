import { WorkspaceKind } from '~/shared/types';

type KindLogoDict = Record<string, string>;

/**
 * Builds a dictionary of kind names to logos, and returns it.
 * @param {WorkspaceKind[]} workspaceKinds - The list of workspace kinds.
 * @returns {KindLogoDict} A dictionary with kind names as keys and logo URLs as values.
 */
export function buildKindLogoDictionary(workspaceKinds: WorkspaceKind[] | []): KindLogoDict {
  const kindLogoDict: KindLogoDict = {};

  for (const workspaceKind of workspaceKinds) {
    try {
      kindLogoDict[workspaceKind.name] = workspaceKind.logo.url;
    } catch {
      kindLogoDict[workspaceKind.name] = '';
    }
  }
  return kindLogoDict;
}

type WorkspaceRedirectStatus = Record<
  string,
  { to: string; message: string; level: string } | null
>;

/**
 * Builds a dictionary of workspace kinds to redirect statuses.
 * @param {WorkspaceKind[]} workspaceKinds - The list of workspace kinds.
 * @returns {WorkspaceRedirectStatus} A dictionary with kind names as keys and redirect status objects as values.
 */
export function buildWorkspaceRedirectStatus(
  workspaceKinds: WorkspaceKind[] | [],
): WorkspaceRedirectStatus {
  const workspaceRedirectStatus: WorkspaceRedirectStatus = {};
  for (const workspaceKind of workspaceKinds) {
    // Loop through the `values` array inside `imageConfig`
    const redirect = workspaceKind.podTemplate.options.imageConfig.values.find(
      (value) => value.redirect,
    )?.redirect;
    // If redirect exists, extract the necessary properties
    workspaceRedirectStatus[workspaceKind.name] = redirect
      ? {
          to: redirect.to,
          message: redirect.message.text,
          level: redirect.message.level,
        }
      : null;
  }
  return workspaceRedirectStatus;
}
