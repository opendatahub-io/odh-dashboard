import { useNavigate } from 'react-router-dom';
import { useAccessReview } from '~/api';
import { AccessReviewResourceAttributes, ProjectKind } from '~/k8sTypes';

type KebabItem = {
  title?: string;
  isDisabled?: boolean;
  isSeparator?: boolean;
  onClick?: () => void;
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
): KebabItem[] => {
  const [allowCreate] = useAccessReview({
    ...accessReviewResource,
    namespace: project.metadata.name,
  });
  const navigate = useNavigate();
  const item: KebabItem[] = [
    {
      title: 'Edit project',
      isDisabled: isRefreshing,
      onClick: () => {
        setEditData(project);
      },
    },
    ...(allowCreate
      ? [
          {
            title: 'Edit permissions',
            onClick: () => {
              navigate(`/projects/${project.metadata.name}`, { state: 'Permissions' });
            },
          },
        ]
      : []),
    {
      isSeparator: true,
    },
    {
      title: 'Delete project',
      onClick: () => {
        setDeleteData(project);
      },
    },
  ];
  return item;
};
export default useProjectTableRowItems;
