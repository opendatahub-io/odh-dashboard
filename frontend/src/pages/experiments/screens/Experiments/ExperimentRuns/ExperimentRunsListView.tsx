import * as React from 'react';
import {
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Button,
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { RegistryExperimentRun } from '#~/concepts/modelRegistry/types';
import { ModelRegistriesContext } from '#~/concepts/modelRegistry/context/ModelRegistriesContext.tsx';
import { compareRunsRoute } from '#~/routes/experiments/registryBase.ts';
import ExperimentRunsTable from './ExperimentRunsTable';

type ExperimentRunsListViewProps = {
  experimentRuns: RegistryExperimentRun[];
};

const ExperimentRunsListView: React.FC<ExperimentRunsListViewProps> = ({ experimentRuns }) => {
  const [selectedRuns, setSelectedRuns] = React.useState<RegistryExperimentRun[]>([]);
  const { preferredModelRegistry } = React.useContext(ModelRegistriesContext);
  const navigate = useNavigate();

  const handleCompareRuns = React.useCallback(() => {
    navigate(
      compareRunsRoute(
        preferredModelRegistry?.metadata.name,
        selectedRuns.map((run) => run.id),
      ),
    );
  }, [navigate, preferredModelRegistry?.metadata.name, selectedRuns]);

  if (experimentRuns.length === 0) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="No experiment runs"
          variant={EmptyStateVariant.lg}
        >
          <EmptyStateBody>This experiment doesn&apos;t have any runs yet.</EmptyStateBody>
        </EmptyState>
      </Bullseye>
    );
  }

  return (
    <>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <Button
              variant="primary"
              isDisabled={selectedRuns.length < 2}
              onClick={handleCompareRuns}
            >
              {selectedRuns.length > 1 ? `Compare runs (${selectedRuns.length})` : 'Compare runs'}
            </Button>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      <ExperimentRunsTable
        experimentRuns={experimentRuns}
        selectedRuns={selectedRuns}
        setSelectedRuns={setSelectedRuns}
      />
    </>
  );
};

export default ExperimentRunsListView;
