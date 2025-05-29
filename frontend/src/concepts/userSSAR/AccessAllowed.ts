import React from 'react';
import { AccessReviewResourceAttributes } from '#~/k8sTypes';
import { useAccessAllowed } from './useAccessAllowed';

type AccessAllowedProps = {
  resourceAttributes: AccessReviewResourceAttributes;
  children: () => React.ReactNode;
  noAccessRender?: () => React.ReactNode;
};

/**
 * Wraps content that is lazy rendered. Uses useAccessAllowed to handle rendering content easier.
 * Consider using verbModelAccess for resourceAttributes.
 * @see verbModelAccess
 * @see useAccessAllowed
 */
export const AccessAllowed: React.FC<AccessAllowedProps> = ({
  resourceAttributes,
  children,
  noAccessRender,
}) => {
  const [isAllowed, isLoaded] = useAccessAllowed(resourceAttributes);

  if (!isLoaded) {
    return null;
  }

  if (!isAllowed) {
    return noAccessRender ? noAccessRender() : null;
  }

  return children();
};
