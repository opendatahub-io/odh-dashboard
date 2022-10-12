import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { ExclamationCircleIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import { NotebookKind } from '../../../k8sTypes';
import useRouteForNotebook from './useRouteForNotebook';
import { getNotebookDisplayName } from '../utils';
import { hasStopAnnotation } from './utils';

type NotebookRouteLinkProps = {
  label?: React.ReactNode;
  notebook: NotebookKind;
  isRunning: boolean;
};

const NotebookRouteLink: React.FC<NotebookRouteLinkProps> = ({ label, notebook, isRunning }) => {
  const [routeLink, loaded, error] = useRouteForNotebook(notebook);
  const isStopped = hasStopAnnotation(notebook);
  const canLink = !!routeLink && !error && !isStopped && isRunning;

  return (
    <Button
      component="a"
      isInline
      isDisabled={!canLink}
      isLoading={!loaded}
      href={error || !routeLink ? undefined : routeLink}
      target="_blank"
      variant="link"
      icon={
        error ? (
          <ExclamationCircleIcon title="Error getting link for notebook" />
        ) : (
          <ExternalLinkAltIcon />
        )
      }
      iconPosition="right"
      style={{ whiteSpace: 'nowrap' }}
    >
      {label ?? getNotebookDisplayName(notebook)}
    </Button>
  );
};

export default NotebookRouteLink;
