import * as React from 'react';
import { Bullseye, Spinner, Button, Stack, StackItem } from '@patternfly/react-core';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import StartingStatusModal from '#~/concepts/pipelines/content/StartingStatusModal.tsx';
import { K8sCondition } from '#~/k8sTypes.ts';

type EnsureAPIAvailabilityProps = {
  children: React.ReactNode;
  isPipeline?: boolean;
};

const spinningText = 'Initializing Pipeline Server';

// if isInitialized but not ready, show spinner; if isNot initialized then show new status
const EnsureAPIAvailability: React.FC<EnsureAPIAvailabilityProps> = ({
  isPipeline = false,
  children,
}) => {
  const { apiAvailable, pipelinesServer } = usePipelinesAPI();
  const [showModal, setShowModal] = React.useState(false);
  const [conditionLog, setConditionLog] = React.useState<K8sCondition[]>([]);

  // Update conditionLog whenever conditions change
  React.useEffect(() => {
    if (pipelinesServer.crStatus?.conditions) {
      // Create a new array with reversed conditions
      const reversedConditions = [...pipelinesServer.crStatus.conditions].reverse();
      // Add to the top of conditionLog
      setConditionLog((prevLog) => [...reversedConditions, ...prevLog]);
    }
  }, [pipelinesServer.crStatus?.conditions]);

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
        <Bullseye style={{ minHeight: 150 }} data-testid="pipelines-api-not-available">
          <Stack hasGutter>
            <StackItem>
              <div className="pf-v6-u-text-align-center">
                <Spinner size="md" className="pf-v6-u-mr-md" />
                {contents}
              </div>
            </StackItem>
            <StackItem>
              <div className="pf-v6-u-text-align-center">This may take a while</div>
            </StackItem>
          </Stack>
        </Bullseye>
      </div>
    );
  };

  const getMainComponent = () => {
    const { isStarting, compatible } = pipelinesServer;
    if (isPipeline) {
      if (isStarting || (!apiAvailable && compatible)) {
        return makePipelineSpinner(!!isStarting);
      }
    }
    if (!apiAvailable && compatible) {
      return (
        <Bullseye style={{ minHeight: 150 }} data-testid="pipelines-api-not-available">
          <Spinner />
        </Bullseye>
      );
    }
    return children;
  };
  return (
    <>
      {getMainComponent()}
      {showModal && (
        <StartingStatusModal onClose={() => setShowModal(false)} conditionLog={conditionLog} />
      )}
    </>
  );
};

export default EnsureAPIAvailability;
