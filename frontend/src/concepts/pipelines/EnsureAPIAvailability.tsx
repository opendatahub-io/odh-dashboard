import * as React from 'react';
import { Bullseye, Spinner, Button, Flex, FlexItem } from '@patternfly/react-core';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import StartingStatusModal from '#~/concepts/pipelines/content/StartingStatusModal.tsx';

type EnsureAPIAvailabilityProps = {
  children: React.ReactNode;
};

const spinningText = 'Initializing Pipeline Server';

// if isInitialized but not ready, show spinner; if isNot initialized then show new status
const EnsureAPIAvailability: React.FC<EnsureAPIAvailabilityProps> = ({ children }) => {
  const { apiAvailable, pipelinesServer, namespace, startingStatusModalOpenRef } =
    usePipelinesAPI();
  const [showModal, setShowModal] = React.useState(false);

  React.useEffect(() => {
    if (startingStatusModalOpenRef.current) {
      startingStatusModalOpenRef.current = showModal ? namespace : null;
    }
  }, [namespace, showModal, startingStatusModalOpenRef]);

  const modalLink = (
    <Button
      data-testid="open-pipeline-status-link"
      variant="link"
      isInline
      onClick={() => {
        setShowModal(true);
      }}
    >
      {spinningText}
    </Button>
  );

  const makePipelineSpinner = (isStarting: boolean) => {
    const contents = isStarting ? modalLink : spinningText;

    return (
      <div>
        <Bullseye data-testid="pipelines-api-not-available">
          <Flex direction={{ default: 'column' }} gap={{ default: 'gapMd' }}>
            <FlexItem>
              <Flex alignSelf={{ default: 'alignSelfCenter' }} gap={{ default: 'gapSm' }}>
                <FlexItem>
                  <Spinner size="md" />
                </FlexItem>
                <FlexItem>{contents}</FlexItem>
              </Flex>
            </FlexItem>
            <FlexItem>
              <div style={{ textAlign: 'center' }}>This may take a while</div>
            </FlexItem>
          </Flex>
        </Bullseye>
      </div>
    );
  };

  const getMainComponent = () => {
    const { isStarting, compatible } = pipelinesServer;

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
