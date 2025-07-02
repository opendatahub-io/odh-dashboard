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
import { ExclamationCircleIcon, ColumnsIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { RegistryExperimentRun } from '#~/concepts/modelRegistry/types';
import { ModelRegistriesContext } from '#~/concepts/modelRegistry/context/ModelRegistriesContext.tsx';
import useExperimentRunsArtifacts from '#~/concepts/modelRegistry/apiHooks/useExperimentRunsArtifacts';
import { metricsRoute } from '#~/routes/experiments/registryBase.ts';
import ExperimentRunsColumnSelector from './ExperimentRunsColumnSelector';
import ExperimentRunsTableWithNestedHeaders from './ExperimentRunsTableWithNestedHeaders';
import { createExperimentRunsColumns, ColumnSelection } from './ExperimentRunsTableColumnsConfig';

type ExperimentRunsListViewProps = {
  experimentRuns: RegistryExperimentRun[];
};

const ExperimentRunsListView: React.FC<ExperimentRunsListViewProps> = ({ experimentRuns }) => {
  const [selectedRuns, setSelectedRuns] = React.useState<RegistryExperimentRun[]>([]);
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = React.useState(false);
  const [selectedColumns, setSelectedColumns] = React.useState<ColumnSelection>({
    metrics: [],
    parameters: [],
    tags: [],
  });

  const { preferredModelRegistry } = React.useContext(ModelRegistriesContext);
  const navigate = useNavigate();

  // Get available columns from artifacts
  const [aggregatedArtifacts] = useExperimentRunsArtifacts(experimentRuns);

  // Initialize selected columns when artifacts are loaded
  React.useEffect(() => {
    if (
      aggregatedArtifacts.metrics.size > 0 ||
      aggregatedArtifacts.parameters.size > 0 ||
      aggregatedArtifacts.tags.size > 0
    ) {
      const newSelection: ColumnSelection = {
        metrics: Array.from(aggregatedArtifacts.metrics).map((metric) => ({
          id: metric,
          name: metric,
          checked: false, // Default to unchecked, user can select what they want
        })),
        parameters: Array.from(aggregatedArtifacts.parameters).map((param) => ({
          id: param,
          name: param,
          checked: false,
        })),
        tags: Array.from(aggregatedArtifacts.tags).map((tag) => ({
          id: tag,
          name: tag,
          checked: false,
        })),
      };
      setSelectedColumns(newSelection);
    }
  }, [aggregatedArtifacts]);

  const handleCompareRuns = React.useCallback(() => {
    navigate(
      metricsRoute(
        preferredModelRegistry?.metadata.name,
        selectedRuns.map((run) => run.id),
      ),
    );
  }, [navigate, preferredModelRegistry?.metadata.name, selectedRuns]);

  const columnConfig = createExperimentRunsColumns(selectedColumns);

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
          <ToolbarItem>
            <Button
              variant="secondary"
              icon={<ColumnsIcon />}
              onClick={() => setIsColumnSelectorOpen(true)}
            >
              Columns
            </Button>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      <ExperimentRunsTableWithNestedHeaders
        experimentRuns={experimentRuns}
        selectedRuns={selectedRuns}
        setSelectedRuns={setSelectedRuns}
        columnConfig={columnConfig}
        selectedColumns={selectedColumns}
      />
      {(aggregatedArtifacts.metrics.size > 0 ||
        aggregatedArtifacts.parameters.size > 0 ||
        aggregatedArtifacts.tags.size > 0) && (
        <ExperimentRunsColumnSelector
          isOpen={isColumnSelectorOpen}
          onClose={() => setIsColumnSelectorOpen(false)}
          availableColumns={aggregatedArtifacts}
          selectedColumns={selectedColumns}
          onSelectionChange={setSelectedColumns}
        />
      )}
    </>
  );
};

export default ExperimentRunsListView;
