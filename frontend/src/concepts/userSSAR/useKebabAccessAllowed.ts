import { IAction } from '@patternfly/react-table';
import { AccessReviewResourceAttributes } from '#~/k8sTypes';
import { useAccessAllowed } from '#~/concepts/userSSAR/useAccessAllowed';

const tooltipArgs = (text: string): Partial<IAction> => ({
  isAriaDisabled: true,
  isDisabled: false,
  // The tooltip is not working until https://github.com/patternfly/patternfly-react/issues/11358 is fixed
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
  const [isAllowed, isLoaded] = useAccessAllowed(resourceAttributes);

  if (actions.length === 0) {
    return [];
  }

  if (!isLoaded) {
    return actions.map((action) => {
      if (action.isSeparator) {
        return action;
      }
      return {
        ...action,
        ...tooltipArgs('Loading...'),
      };
    });
  }

  if (isAllowed) {
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
