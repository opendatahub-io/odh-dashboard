import * as React from 'react';
import { Bullseye, Spinner, Button, Flex, FlexItem } from '@patternfly/react-core';
import { usePipelinesAPI, PipelineServerTimedOut } from '#~/concepts/pipelines/context';
import StartingStatusModal from '#~/concepts/pipelines/content/StartingStatusModal.tsx';

type EnsureAPIAvailabilityProps = {
  children: React.ReactNode;
};

// if isInitialized but not ready, show spinner; if isNot initialized then show new status
const EnsureAPIAvailability: React.FC<EnsureAPIAvailabilityProps> = ({ children }) => {
  const { apiAvailable, pipelinesServer, namespace, startingStatusModalOpenRef } =
    usePipelinesAPI();

  const [showModal, setShowModal] = React.useState(false);

  React.useEffect(() => {
    if (startingStatusModalOpenRef) {
      startingStatusModalOpenRef.current = showModal ? namespace : null;
    }
  }, [namespace, showModal, startingStatusModalOpenRef]);

  const defaultConnectingText = (
    <Flex direction={{ default: 'column' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>The {namespace} pipeline server connection is being established.</FlexItem>
      <FlexItem>The process should take less than five minutes. When the server is ready,</FlexItem>
      <FlexItem>you will be able to create and import pipelines.</FlexItem>
    </Flex>
  );

  const modalLink = (
    <Flex direction={{ default: 'column' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>The {namespace} pipeline server is being initialized.</FlexItem>
      <FlexItem>The process should take less than five minutes. When the server is ready,</FlexItem>
      <Flex
        direction={{ default: 'column' }}
        spaceItems={{ default: 'spaceItemsLg' }}
        alignItems={{ default: 'alignItemsCenter' }}
      >
        <FlexItem>you will be able to create and import pipelines.</FlexItem>
        <FlexItem>
          <Button
            data-testid="open-pipeline-status-link"
            variant="secondary"
            onClick={() => {
              setShowModal(true);
            }}
          >
            View progress and event logs
          </Button>
        </FlexItem>
      </Flex>
    </Flex>
  );

  const makePipelineSpinner = (isStarting: boolean) => {
    const contents = isStarting ? modalLink : defaultConnectingText;

    return (
      <div>
        <Bullseye data-testid="pipelines-api-not-available">
          <Flex
            direction={{ default: 'column' }}
            gap={{ default: 'gapMd' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>
              <Spinner diameter="80px" />
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
  return (
    <>
      {getMainComponent()}
      {showModal && <StartingStatusModal onClose={() => setShowModal(false)} />}
    </>
  );
};

export default EnsureAPIAvailability;
