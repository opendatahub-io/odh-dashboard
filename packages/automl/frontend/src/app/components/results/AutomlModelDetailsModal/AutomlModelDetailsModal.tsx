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
import {
  mockMulticlassContext,
  mockMulticlassFeatureImportances,
  mockMulticlassConfusionMatrices,
} from '~/app/mocks/mockAutomlResultsContext';
import { computeRankMap } from '~/app/utilities/utils';
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
}) => {
  const context = mockMulticlassContext;
  const models = Object.values(context.models);
  const taskType = context.parameters.task_type;
  const labelColumn = context.parameters.label_column;
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
  const featureImportance = mockMulticlassFeatureImportances[selectedModelName];
  const confusionMatrix = mockMulticlassConfusionMatrices[selectedModelName];

  // TODO: uncomment when integrating with AutomlResultsContext
  // const notebookKey = model.location.notebook;
  // const { data: notebook } = useS3GetFileQuery(namespace, undefined, undefined, notebookKey);
  // const handleSaveNotebook = React.useCallback(() => {
  //   if (!notebook) {
  //     return;
  //   }
  //   const url = URL.createObjectURL(notebook);
  //   const link = document.createElement('a');
  //   link.href = url;
  //   link.download = 'automl_predictor_notebook.ipynb';
  //   document.body.appendChild(link);
  //   link.click();
  //   document.body.removeChild(link);
  //   URL.revokeObjectURL(url);
  // }, [notebook]);
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
    const frameId = requestAnimationFrame(() => {
      window.print();
      setIsPrinting(false);
    });
    return () => cancelAnimationFrame(frameId);
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
          onSelectModel={(name) => setSelectedModelName(name)}
          onDownload={() => setIsPrinting(true)}
          onSaveNotebook={handleSaveNotebook}
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
                      labelColumn={labelColumn}
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
                    labelColumn={labelColumn}
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
