import React from 'react';
import {
  Button,
  Grid,
  GridItem,
  Modal,
  ModalBody,
  ModalHeader,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
// TODO: Remove all mock imports when integrating with AutomlResultsContext
import {
  mockTabularContext,
  mockTimeseriesContext,
  mockTabularFeatureImportances,
  mockTabularConfusionMatrices,
  mockTimeseriesFeatureImportances,
} from '~/app/mocks/mockAutomlResultsContext';
import type { TaskType } from '~/app/types';
import { computeRankMap } from '~/app/utilities/utils';
// TODO: import { downloadBlob } from '~/app/utilities/utils'; when integrating with AutomlResultsContext
// TODO: uncomment when integrating with AutomlResultsContext
// import { useS3GetFileQuery, useModelEvaluationArtifactsQuery } from '~/app/hooks/queries';
import { getVisibleTabs, type TabDefinition } from './tabConfig';
import AutomlModelDetailsModalHeader from './AutomlModelDetailsModalHeader';
import './AutomlModelDetailsModal.scss';

type AutomlModelDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  modelName: string;
  rank: number;
  // TODO: Remove taskType prop when integrating with AutomlResultsContext
  taskType: TaskType;
};

/** Group tabs by their section for sidebar rendering. */
function groupTabsBySection(tabs: TabDefinition[]): Map<string, TabDefinition[]> {
  const groups = new Map<string, TabDefinition[]>();
  for (const tab of tabs) {
    const existing = groups.get(tab.section) ?? [];
    existing.push(tab);
    groups.set(tab.section, existing);
  }
  return groups;
}

const AutomlModelDetailsModal: React.FC<AutomlModelDetailsModalProps> = ({
  isOpen,
  onClose,
  modelName,
  rank: initialRank,
  taskType,
}) => {
  // TODO: Replace with useAutomlResultsContext() when available
  const context = taskType === 'timeseries' ? mockTimeseriesContext : mockTabularContext;
  const models = Object.values(context.models);
  const { parameters } = context;
  const createdAt = context.pipelineRun.created_at;

  const [selectedModelName, setSelectedModelName] = React.useState(modelName);

  React.useEffect(() => {
    setSelectedModelName(modelName);
  }, [modelName]);

  const rankMap = React.useMemo(
    () => computeRankMap(context.models, taskType),
    [context.models, taskType],
  );
  const model = context.models[selectedModelName];
  const rank = selectedModelName === modelName ? initialRank : rankMap[selectedModelName];

  // TODO: uncomment when integrating with AutomlResultsContext
  // const { namespace } = useParams<{ namespace: string }>();
  // const isClassification = taskType === 'binary' || taskType === 'multiclass';
  // const modelDirectory = model.location.model_directory;
  // const { featureImportance, confusionMatrix } = useModelEvaluationArtifactsQuery(
  //   namespace,
  //   modelDirectory,
  //   isClassification,
  // );
  const featureImportanceMap =
    taskType === 'timeseries' ? mockTimeseriesFeatureImportances : mockTabularFeatureImportances;
  const featureImportance = featureImportanceMap[selectedModelName];
  const confusionMatrix =
    taskType === 'timeseries' ? undefined : mockTabularConfusionMatrices[selectedModelName];

  // TODO: uncomment when integrating with AutomlResultsContext
  // const notebookKey = model.location.notebook;
  // const notebookFilename = notebookKey.split('/').pop() ?? 'notebook.ipynb';
  // const { data: notebook } = useS3GetFileQuery(namespace, undefined, undefined, notebookKey);
  // const handleSaveNotebook = React.useCallback(() => {
  //   if (notebook) {
  //     downloadBlob(notebook, notebookFilename);
  //   }
  // }, [notebook, notebookFilename]);
  const handleSaveNotebook = React.useCallback(() => undefined, []);

  const visibleTabs = React.useMemo(() => getVisibleTabs(taskType), [taskType]);
  const [activeTabKey, setActiveTabKey] = React.useState(visibleTabs[0]?.key ?? '');
  const groupedTabs = React.useMemo(() => groupTabsBySection(visibleTabs), [visibleTabs]);

  React.useEffect(() => {
    setActiveTabKey(visibleTabs[0]?.key ?? '');
  }, [visibleTabs]);

  const [isPrinting, setIsPrinting] = React.useState(false);

  // Mount print container, wait for render, then trigger print
  React.useEffect(() => {
    if (!isPrinting) {
      return;
    }
    const handleAfterPrint = () => setIsPrinting(false);
    window.addEventListener('afterprint', handleAfterPrint);
    const frameId = requestAnimationFrame(() => {
      window.print();
    });
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [isPrinting]);

  const activeTab = visibleTabs.find((t) => t.key === activeTabKey);
  const ActiveComponent = activeTab?.component;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Record<string,T> hides runtime undefined
  if (!model) {
    return null;
  }

  return (
    <Modal
      variant="large"
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="automl-model-details-title"
      data-testid="automl-model-details-modal"
      className="automl-model-details-modal"
    >
      <ModalHeader labelId="automl-model-details-title" />
      <ModalBody>
        <AutomlModelDetailsModalHeader
          models={models}
          currentModelName={selectedModelName}
          rank={rank}
          rankMap={rankMap}
          onSelectModel={(name) => setSelectedModelName(name)}
          onDownload={() => setIsPrinting(true)}
          onSaveNotebook={handleSaveNotebook}
          isDownloadDisabled={!featureImportance}
        />
        <Grid hasGutter className="automl-model-details-screen-only">
          <GridItem span={2} className="automl-model-details-sidebar">
            <nav aria-label="Model details navigation">
              {[...groupedTabs.entries()].map(([section, tabs]) => (
                <div key={section}>
                  <div className="automl-model-details-sidebar-section">{section}</div>
                  <ul className="automl-model-details-nav-list">
                    {tabs.map((tab) => (
                      <li key={tab.key}>
                        <button
                          type="button"
                          className={`automl-model-details-nav-item${
                            activeTabKey === tab.key ? ' automl-model-details-nav-item--active' : ''
                          }`}
                          onClick={() => setActiveTabKey(tab.key)}
                          data-testid={`tab-${tab.key}`}
                        >
                          {tab.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </GridItem>
          <GridItem span={10}>
            {activeTab && (
              <>
                <div className="automl-model-details-tab-title">
                  <Title headingLevel="h2">{activeTab.label}</Title>
                  <Tooltip content={activeTab.tooltip} position="right">
                    <Button
                      variant="plain"
                      aria-label={`${activeTab.label} info`}
                      icon={<OutlinedQuestionCircleIcon />}
                    />
                  </Tooltip>
                </div>
                <div className="automl-model-details-tab-content">
                  {ActiveComponent && (
                    <ActiveComponent
                      model={model}
                      taskType={taskType}
                      parameters={parameters}
                      createdAt={createdAt}
                      featureImportance={featureImportance}
                      confusionMatrix={confusionMatrix}
                    />
                  )}
                </div>
              </>
            )}
          </GridItem>
        </Grid>

        {/* Print-only container: mounts only when downloading, renders ALL tabs */}
        {isPrinting && (
          <div className="automl-model-details-print-only">
            <div className="automl-print-header">
              <h1>{model.display_name}</h1>
              <p>
                Rank: {rank} | {model.model_config.eval_metric}
              </p>
            </div>
            {visibleTabs.map((tab) => {
              const TabComponent = tab.component;
              return (
                <div key={tab.key} className="automl-print-page">
                  <Title headingLevel="h2">{tab.label}</Title>
                  <TabComponent
                    model={model}
                    taskType={taskType}
                    parameters={parameters}
                    createdAt={createdAt}
                    featureImportance={featureImportance}
                    confusionMatrix={confusionMatrix}
                  />
                </div>
              );
            })}
          </div>
        )}
      </ModalBody>
    </Modal>
  );
};

export default AutomlModelDetailsModal;
