import { IAction } from '@patternfly/react-table';
import { AccessReviewResourceAttributes } from '~/k8sTypes';
import { useAccessAllowed } from '~/concepts/userSSAR/useAccessAllowed';

const tooltipArgs = (text: string): Partial<IAction> => ({
  isAriaDisabled: false,
  isDisabled: false,
  tooltipProps: { title: text, content: text },
});

/**
 * Uses useAccessAllowed to help handle Kebab actions easier.
 * Consider using verbModelAccess for resourceAttributes.
 * @see verbModelAccess
 * @see useAccessAllowed
 */
export const useKebabAccessAllowed = (
  actions: IAction[],
  resourceAttributes: AccessReviewResourceAttributes,
): IAction[] => {
  const [canAccess, loaded] = useAccessAllowed(resourceAttributes);

  if (actions.length === 0) {
    return [];
  }

  if (!loaded) {
    return actions.map((action) => {
      if (action.isSeparator) {
        return action;
      }
      return {
        ...action,
        ...tooltipArgs('Loading...'),
        title: `--${action.title}`,
      };
    });
  }

  if (canAccess) {
    return actions;
  }

  return actions.map((action) => {
    if (action.isSeparator) {
      return action;
    }
    return {
      ...action,
      ...tooltipArgs('No access'),
    };
  });
};
