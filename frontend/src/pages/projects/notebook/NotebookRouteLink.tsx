import * as React from 'react';
import { Button, ButtonVariant, Flex, FlexItem, Icon, Tooltip } from '@patternfly/react-core';
import { ExclamationCircleIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import { NotebookKind } from '../../../k8sTypes';
import useRouteForNotebook from './useRouteForNotebook';
import { getNotebookDisplayName } from '../utils';
import { hasStopAnnotation } from './utils';

type NotebookRouteLinkProps = {
  label?: React.ReactNode;
  notebook: NotebookKind;
  isRunning: boolean;
  variant?: ButtonVariant;
  isLarge?: boolean;
};

const NotebookRouteLink: React.FC<NotebookRouteLinkProps> = ({
  label,
  notebook,
  isRunning,
  variant,
  isLarge,
}) => {
  const [routeLink, loaded, error] = useRouteForNotebook(
    notebook.metadata.name,
    notebook.metadata.namespace,
  );
  const isStopped = hasStopAnnotation(notebook);
  const canLink = loaded && !!routeLink && !error && !isStopped && isRunning;

  return (
    <Flex spaceItems={{ default: 'spaceItemsXs' }}>
      <FlexItem>
        <Button
          component="a"
          isInline
          isDisabled={!canLink}
          href={error || !routeLink ? undefined : routeLink}
          target="_blank"
          variant={variant || 'link'}
          icon={!error && <ExternalLinkAltIcon />}
          iconPosition="right"
          style={{
            whiteSpace: 'nowrap',
            fontSize: isLarge ? 'var(--pf-global--FontSize--md)' : 'var(--pf-global--FontSize--sm)',
          }}
        >
          {label ?? getNotebookDisplayName(notebook)}
        </Button>
      </FlexItem>
      {error && (
        <FlexItem>
          <Tooltip content={error.message}>
            <Icon status="danger">
              <ExclamationCircleIcon />
            </Icon>
          </Tooltip>
        </FlexItem>
      )}
    </Flex>
  );
};

export default NotebookRouteLink;
