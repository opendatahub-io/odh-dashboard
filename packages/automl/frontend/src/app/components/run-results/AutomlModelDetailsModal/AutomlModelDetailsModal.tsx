import React from 'react';
import ReactDOM from 'react-dom';
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
import { useParams } from 'react-router';
import { useAutomlResultsContext } from '~/app/context/AutomlResultsContext';
import { computeRankMap, getOptimizedMetricForTask } from '~/app/utilities/utils';
import { TASK_TYPE_TIMESERIES } from '~/app/utilities/const';
import { useModelEvaluationArtifactsQuery } from '~/app/hooks/queries';
import { getVisibleTabs, type TabDefinition } from './tabConfig';
import AutomlModelDetailsModalHeader from './AutomlModelDetailsModalHeader';
import './AutomlModelDetailsModal.scss';

type AutomlModelDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  modelName: string;
  rank: number;
  onClickSaveNotebook?: (modelName: string) => void;
  onRegisterModel?: (modelName: string) => void;
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
  onClickSaveNotebook,
  onRegisterModel,
}) => {
  const { models: modelsRecord, parameters, pipelineRun } = useAutomlResultsContext();
  const models = Object.values(modelsRecord);
  const taskType = parameters?.task_type ?? TASK_TYPE_TIMESERIES;
  const evalMetric = getOptimizedMetricForTask(taskType);
  const createdAt = pipelineRun?.created_at;

  const [selectedModelName, setSelectedModelName] = React.useState(modelName);

  React.useEffect(() => {
    setSelectedModelName(modelName);
  }, [modelName]);

  const rankMap = React.useMemo(
    () => computeRankMap(modelsRecord, taskType),
    [modelsRecord, taskType],
  );
  const model = modelsRecord[selectedModelName];
  const rank = selectedModelName === modelName ? initialRank : rankMap[selectedModelName];

  const { namespace } = useParams<{ namespace: string }>();
  const isClassification = taskType === 'binary' || taskType === 'multiclass';
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Record<string,T> hides runtime undefined
  const modelDirectory = model?.location?.model_directory;
  const {
    featureImportance,
    confusionMatrix,
    isLoading: isArtifactsLoading,
  } = useModelEvaluationArtifactsQuery(namespace, modelDirectory, isClassification);

  const visibleTabs = React.useMemo(() => getVisibleTabs(taskType), [taskType]);
  const [activeTabKey, setActiveTabKey] = React.useState(visibleTabs[0]?.key ?? '');
  const groupedTabs = React.useMemo(() => groupTabsBySection(visibleTabs), [visibleTabs]);

  React.useEffect(() => {
    setActiveTabKey(visibleTabs[0]?.key ?? '');
  }, [visibleTabs]);

  const [isPrinting, setIsPrinting] = React.useState(false);

  React.useEffect(() => {
    if (!isPrinting) {
      return;
    }
    const handleAfterPrint = () => setIsPrinting(false);
    window.addEventListener('afterprint', handleAfterPrint);
    window.print();
    return () => {
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
    <>
      <Modal
        variant="large"
        isOpen={isOpen}
        onClose={onClose}
        aria-labelledby="automl-model-details-title"
        data-testid="automl-model-details-modal"
        className="automl-model-details-modal"
      >
        <ModalHeader title="Model details" labelId="automl-model-details-title" />
        <ModalBody>
          <AutomlModelDetailsModalHeader
            models={models}
            currentModelName={selectedModelName}
            rank={rank}
            rankMap={rankMap}
            evalMetric={evalMetric}
            onSelectModel={(name) => setSelectedModelName(name)}
            onDownload={() => setIsPrinting(true)}
            onSaveNotebook={
              onClickSaveNotebook
                ? () => {
                    onClickSaveNotebook(selectedModelName);
                  }
                : undefined
            }
            onRegisterModel={
              onRegisterModel
                ? () => {
                    onClose();
                    onRegisterModel(selectedModelName);
                  }
                : undefined
            }
            isDownloadDisabled={taskType !== TASK_TYPE_TIMESERIES && !featureImportance}
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
                              activeTabKey === tab.key
                                ? ' automl-model-details-nav-item--active'
                                : ''
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
                        isArtifactsLoading={isArtifactsLoading}
                      />
                    )}
                  </div>
                </>
              )}
            </GridItem>
          </Grid>
        </ModalBody>
      </Modal>

      {/* Print-only container: portalled to document.body so it sits outside
          the PF modal DOM — avoids backdrop/overflow/centering issues across
          browsers. Each tab is rendered as a separate print page with its
          own header since CSS cannot repeat arbitrary headers. */}
      {isPrinting &&
        ReactDOM.createPortal(
          <div className="odh-autox-print-only" data-testid="print-container">
            {visibleTabs.map((tab, index) => {
              const TabComponent = tab.component;
              return (
                <div
                  key={tab.key}
                  className={`automl-print-page${index === 0 ? ' automl-print-page--first' : ''}`}
                  data-testid={`print-page-${tab.key}`}
                >
                  <div className="automl-print-header">
                    <h1>{model.name}</h1>
                    <p>
                      Rank: {rank} | {evalMetric}
                    </p>
                  </div>
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
          </div>,
          document.body,
        )}
    </>
  );
};

export default AutomlModelDetailsModal;
