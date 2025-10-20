import * as React from 'react';
import { Button, ButtonVariant, Flex, FlexItem } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import {
  t_global_font_size_body_default as DefaultFontSize,
  t_global_font_size_body_sm as SmallFontSize,
} from '@patternfly/react-tokens';
import { NotebookKind } from '#~/k8sTypes';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { fireMiscTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { getRoutePathForWorkbench } from '#~/concepts/notebooks/utils';
import { hasStopAnnotation } from './utils';

type NotebookRouteLinkProps = {
  className?: string;
  label?: React.ReactNode;
  'aria-label'?: string;
  notebook: NotebookKind;
  isRunning: boolean;
  variant?: ButtonVariant;
  isLarge?: boolean;
  buttonStyle?: React.CSSProperties | undefined;
};

const NotebookRouteLink: React.FC<NotebookRouteLinkProps> = ({
  className,
  label,
  notebook,
  isRunning,
  'aria-label': ariaLabel,
  variant,
  isLarge,
  buttonStyle,
}) => {
  const isStopped = hasStopAnnotation(notebook);
  const canLink = !isStopped && isRunning;
  const routeLink = canLink
    ? getRoutePathForWorkbench(notebook.metadata.namespace || '', notebook.metadata.name || '')
    : undefined;

  return (
    <Flex className={className} spaceItems={{ default: 'spaceItemsXs' }}>
      <FlexItem>
        <Button
          component="a"
          isInline
          data-testid="notebook-route-link"
          isDisabled={!canLink}
          isAriaDisabled={!canLink}
          href={routeLink}
          target="_blank"
          variant={variant || 'link'}
          icon={<ExternalLinkAltIcon />}
          iconPosition="end"
          aria-label={ariaLabel}
          style={{
            whiteSpace: 'nowrap',
            fontSize: isLarge ? DefaultFontSize.var : SmallFontSize.var,
            ...(buttonStyle || {}),
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
    </Flex>
  );
};

export default NotebookRouteLink;
