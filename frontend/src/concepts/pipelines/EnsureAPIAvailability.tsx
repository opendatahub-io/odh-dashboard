import * as React from 'react';
import { Bullseye, Spinner, Button, Flex, FlexItem, Title } from '@patternfly/react-core';
import {
  usePipelinesAPI,
  PipelineServerTimedOut,
  DeleteServerModal,
} from '#~/concepts/pipelines/context';
import StartingStatusModal from '#~/concepts/pipelines/content/StartingStatusModal';
import { getPipelineServerName } from './context/PipelinesContext';

type EnsureAPIAvailabilityProps = {
  inTab?: boolean;
  children: React.ReactNode;
};

// if isInitialized but not ready, show spinner; if isNot initialized then show new status
const EnsureAPIAvailability: React.FC<EnsureAPIAvailabilityProps> = ({
  inTab = false,
  children,
}) => {
  const { apiAvailable, pipelinesServer, namespace, startingStatusModalOpenRef, project } =
    usePipelinesAPI();

  const [showModal, setShowModal] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const deleteIsAvailable = namespace && pipelinesServer.name && !isDeleting;

  React.useEffect(() => {
    if (startingStatusModalOpenRef) {
      startingStatusModalOpenRef.current = showModal ? namespace : null;
    }
  }, [namespace, showModal, startingStatusModalOpenRef]);

  const pipelineServerName = getPipelineServerName(project);
  const defaultConnectingText = (
    <Flex direction={{ default: 'column' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>The {pipelineServerName} connection is being established.</FlexItem>
      <FlexItem>The process should take less than five minutes. When the server is ready,</FlexItem>
      <FlexItem>you will be able to create and import pipelines.</FlexItem>
    </Flex>
  );

  const inProgressButtons = (
    <Flex direction={{ default: 'column' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>
        <Title headingLevel="h2" size="lg">
          Starting pipeline server
        </Title>
      </FlexItem>
      <FlexItem>The {pipelineServerName} is being initialized.</FlexItem>
      <FlexItem>The process should take less than five minutes. When the server is ready,</FlexItem>
      <Flex
        direction={{ default: 'column' }}
        spaceItems={{ default: 'spaceItemsMd' }}
        alignItems={{ default: 'alignItemsCenter' }}
      >
        <FlexItem>you will be able to create and import pipelines.</FlexItem>
        <FlexItem>
          <Button
            data-testid="open-pipeline-status-link"
            variant="primary"
            onClick={() => {
              setShowModal(true);
            }}
          >
            View progress and event logs
          </Button>
        </FlexItem>
        <FlexItem>
          <Button
            data-testid="delete-init-pipeline-server"
            variant="secondary"
            onClick={() => {
              setIsDeleting(true);
            }}
            isDisabled={!deleteIsAvailable}
          >
            Cancel pipeline server setup
          </Button>
        </FlexItem>
      </Flex>
    </Flex>
  );

  const makePipelineSpinner = (isStarting: boolean) => {
    const contents = isStarting ? inProgressButtons : defaultConnectingText;

    const diameter = inTab ? '60px' : '80px';
    const topMargin = inTab ? '-50px' : '25px';
    return (
      <div style={{ marginTop: topMargin }}>
        <Bullseye data-testid="pipelines-api-not-available">
          <Flex
            direction={{ default: 'column' }}
            gap={{ default: 'gapMd' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>
              <Spinner diameter={diameter} />
            </FlexItem>
            {contents}
          </Flex>
        </Bullseye>
      </div>
    );
  };

  const getMainComponent = () => {
    const { isStarting, compatible, timedOut } = pipelinesServer;

    if (timedOut && compatible) {
      return <PipelineServerTimedOut />;
    }
    if (isStarting) {
      return makePipelineSpinner(!!isStarting);
    }

    if (!apiAvailable && compatible) {
      return (
        <Bullseye style={{ minHeight: '150px' }} data-testid="pipelines-api-not-available">
          <Spinner />
        </Bullseye>
      );
    }

    return children;
  };
  // deleteServerModal is on the top so it can always be shown (even after the server is done
  // being initialized)
  return (
    <>
      {getMainComponent()}
      {showModal && (
        <StartingStatusModal
          onClose={() => setShowModal(false)}
          onDelete={() => {
            setShowModal(false);
            setIsDeleting(true);
          }}
        />
      )}
      {isDeleting ? (
        <DeleteServerModal removeConfirmation={true} onClose={() => setIsDeleting(false)} />
      ) : null}
    </>
  );
};

export default EnsureAPIAvailability;
