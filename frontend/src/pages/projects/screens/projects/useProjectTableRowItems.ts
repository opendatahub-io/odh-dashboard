import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { TooltipProps } from '@patternfly/react-core';
import { ProjectKind } from '#~/k8sTypes';
import {
  useProjectAccessReview,
  useProjectPermissionsAccessReview,
} from '#~/concepts/projects/accessChecks';

type KebabItem = {
  title?: string;
  isAriaDisabled?: boolean;
  isSeparator?: boolean;
  onClick?: () => void;
  tooltipProps?: TooltipProps;
};
const useProjectTableRowItems = (
  project: ProjectKind,
  isRefreshing: boolean,
  setEditData: (data: ProjectKind) => void,
  setDeleteData: (data: ProjectKind) => void,
): [KebabItem[], () => void] => {
  const navigate = useNavigate();
  const [shouldRunCheck, setShouldRunCheck] = React.useState(false);

  const [allowUpdate, allowUpdateLoaded] = useProjectAccessReview(
    'update',
    project.metadata.name,
    shouldRunCheck,
  );
  const [allowPermissions, allowPermissionsLoaded] = useProjectPermissionsAccessReview(
    'create',
    project.metadata.name,
    shouldRunCheck,
  );
  const [allowDelete, allowDeleteLoaded] = useProjectAccessReview(
    'delete',
    project.metadata.name,
    shouldRunCheck,
  );

  const runAccesCheck = React.useCallback(() => {
    setShouldRunCheck(true);
  }, []);

  const noPermissionToolTip = (allow: boolean, loaded: boolean): Partial<KebabItem> | undefined =>
    !allow && loaded
      ? { tooltipProps: { content: 'You do not have permissions to perform this action' } }
      : undefined;

  const item: KebabItem[] = [
    {
      title: 'Edit project',
      isAriaDisabled: isRefreshing || !allowUpdate || !allowUpdateLoaded,
      onClick: () => {
        setEditData(project);
      },
      ...noPermissionToolTip(allowUpdate, allowUpdateLoaded),
    },
    {
      title: 'Edit permissions',
      isAriaDisabled: !allowPermissions || !allowPermissionsLoaded,
      onClick: () => {
        navigate(`/projects/${project.metadata.name}?section=permissions`);
      },
      ...noPermissionToolTip(allowPermissions, allowPermissionsLoaded),
    },
    {
      isSeparator: true,
    },
    {
      title: 'Delete project',
      isAriaDisabled: !allowDelete || !allowDeleteLoaded,
      onClick: () => {
        setDeleteData(project);
      },
      ...noPermissionToolTip(allowDelete, allowDeleteLoaded),
    },
  ];
  return [item, runAccesCheck];
};
export default useProjectTableRowItems;
