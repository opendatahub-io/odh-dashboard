import * as React from 'react';
import {
  EmptyState,
  EmptyStateVariant,
  Bullseye,
  Spinner,
  EmptyStateHeader,
  EmptyStateActions,
  EmptyStateFooter,
  EmptyStateBody,
  Button,
  EmptyStateIcon,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import DeletePipelineServerModal from '~/concepts/pipelines/content/DeletePipelineServerModal';
import ExternalLink from '~/components/ExternalLink';
import NoPipelineServer from './NoPipelineServer';
import { usePipelinesAPI } from './context';

// TODO: Fix doc link to go to more docs on v2
const DOCS_LINK =
  'https://access.redhat.com/documentation/en-us/red_hat_openshift_ai_self-managed/2.7/html/release_notes/support-removals_relnotes';

type EnsureCompatiblePipelineServerProps = {
  children: React.ReactNode;
};

const EnsureCompatiblePipelineServer: React.FC<EnsureCompatiblePipelineServerProps> = ({
  children,
}) => {
  const { pipelinesServer } = usePipelinesAPI();
  const [isDeleting, setIsDeleting] = React.useState(false);

  if (pipelinesServer.initializing) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!pipelinesServer.installed) {
    return <NoPipelineServer variant="secondary" />;
  }

  if (!pipelinesServer.compatible) {
    return (
      <>
        <Bullseye data-testid="incompatible-pipelines-server">
          <EmptyState variant={EmptyStateVariant.lg}>
            <EmptyStateHeader
              titleText="This pipeline version is no longer supported"
              icon={
                <EmptyStateIcon
                  color="var(--pf-v5-global--warning-color--100)"
                  icon={ExclamationTriangleIcon}
                />
              }
            />
            <EmptyStateBody>
              To remove unsupported versions, delete this project&lsquo;s pipeline server and create
              a new one.{' '}
              <ExternalLink
                text="Learn more about supported versions and data recovery"
                to={DOCS_LINK}
              />
            </EmptyStateBody>
            <EmptyStateFooter>
              <EmptyStateActions>
                <Button variant="primary" onClick={() => setIsDeleting(true)}>
                  Delete pipeline server
                </Button>
              </EmptyStateActions>
            </EmptyStateFooter>
          </EmptyState>
        </Bullseye>
        <DeletePipelineServerModal isOpen={isDeleting} onClose={() => setIsDeleting(false)} />
      </>
    );
  }

  return <>{children}</>;
};

export default EnsureCompatiblePipelineServer;
