import * as React from 'react';
import { Button, ButtonVariant, Flex, FlexItem, Icon, Tooltip } from '@patternfly/react-core';
import { ExclamationCircleIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import { NotebookKind } from '~/k8sTypes';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { fireMiscTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import useRouteForNotebook from './useRouteForNotebook';
import { hasStopAnnotation } from './utils';

type NotebookRouteLinkProps = {
  className?: string;
  label?: React.ReactNode;
  notebook: NotebookKind;
  isRunning: boolean;
  variant?: ButtonVariant;
  isLarge?: boolean;
};

const NotebookRouteLink: React.FC<NotebookRouteLinkProps> = ({
  className,
  label,
  notebook,
  isRunning,
  variant,
  isLarge,
}) => {
  const [routeLink, loaded, error] = useRouteForNotebook(
    notebook.metadata.name,
    notebook.metadata.namespace,
    isRunning,
  );
  const isStopped = hasStopAnnotation(notebook);
  const canLink = loaded && !!routeLink && !error && !isStopped && isRunning;

  return (
    <Flex className={className} spaceItems={{ default: 'spaceItemsXs' }}>
      <FlexItem>
        <Button
          component="a"
          isInline
          data-testid="notebook-route-link"
          isDisabled={!canLink}
          href={error || !routeLink ? undefined : routeLink}
          target="_blank"
          variant={variant || 'link'}
          icon={!error && <ExternalLinkAltIcon />}
          iconPosition="right"
          style={{
            whiteSpace: 'nowrap',
            fontSize: isLarge
              ? 'var(--pf-t--global--font--size--body--default)'
              : 'var(--pf-t--global--font--size--body--sm)',
          }}
          onClick={() => {
            fireMiscTrackingEvent('Workbench Opened', {
              wbName: getDisplayNameFromK8sResource(notebook),
            });
          }}
        >
          {label ?? getDisplayNameFromK8sResource(notebook)}
        </Button>
      </FlexItem>
      {error && (
        <FlexItem>
          <Tooltip content={error.message}>
            <Icon role="button" aria-label="error icon" status="danger" tabIndex={0}>
              <ExclamationCircleIcon />
            </Icon>
          </Tooltip>
        </FlexItem>
      )}
    </Flex>
  );
};

export default NotebookRouteLink;
