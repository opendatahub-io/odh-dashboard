import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { TooltipProps } from '@patternfly/react-core';
import { useAccessReview } from '~/api';
import { AccessReviewResourceAttributes, ProjectKind } from '~/k8sTypes';

type KebabItem = {
  title?: string;
  isAriaDisabled?: boolean;
  isSeparator?: boolean;
  onClick?: () => void;
  tooltipProps?: TooltipProps;
};
const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'rbac.authorization.k8s.io',
  resource: 'rolebindings',
  verb: 'create',
};
const useProjectTableRowItems = (
  project: ProjectKind,
  isRefreshing: boolean,
  setEditData: (data: ProjectKind) => void,
  setDeleteData: (data: ProjectKind) => void,
): [KebabItem[], () => void] => {
  const navigate = useNavigate();
  const [shouldRunCheck, setShouldRunCheck] = React.useState(false);

  const [allowUpdate, allowUpdateLoaded] = useAccessReview(
    {
      ...accessReviewResource,
      namespace: project.metadata.name,
      verb: 'update',
    },
    shouldRunCheck,
  );
  const [allowCreate, allowCreateLoaded] = useAccessReview(
    {
      ...accessReviewResource,
      namespace: project.metadata.name,
    },
    shouldRunCheck,
  );
  const [allowDelete, allowDeleteLoaded] = useAccessReview(
    {
      ...accessReviewResource,
      namespace: project.metadata.name,
      verb: 'delete',
    },
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
      isAriaDisabled: !allowCreate || !allowCreateLoaded,
      onClick: () => {
        navigate(`/projects/${project.metadata.name}?section=permissions`);
      },
      ...noPermissionToolTip(allowCreate, allowCreateLoaded),
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
