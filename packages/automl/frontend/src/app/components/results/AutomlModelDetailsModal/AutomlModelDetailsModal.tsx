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
import type { ModelArtifact, FeatureImportanceData, ConfusionMatrixData } from '~/app/types';
import { getVisibleTabs, type TabDefinition } from './tabConfig';
import AutomlModelDetailsModalHeader from './AutomlModelDetailsModalHeader';
import './AutomlModelDetailsModal.scss';

type AutomlModelDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  models: ModelArtifact[];
  selectedIndex: number;
  onSelectModel: (index: number) => void;
  createdAt?: string;
  featureImportance?: FeatureImportanceData;
  confusionMatrix?: ConfusionMatrixData;
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
  models,
  selectedIndex,
  onSelectModel,
  createdAt,
  featureImportance,
  confusionMatrix,
}) => {
  const model = models[selectedIndex];
  const rank = selectedIndex + 1;

  const visibleTabs = React.useMemo(
    () => getVisibleTabs(model.context.task_type),
    [model.context.task_type],
  );
  const [activeTabKey, setActiveTabKey] = React.useState(visibleTabs[0]?.key ?? '');
  const groupedTabs = React.useMemo(() => groupTabsBySection(visibleTabs), [visibleTabs]);

  // Reset active tab when model changes
  React.useEffect(() => {
    setActiveTabKey(visibleTabs[0]?.key ?? '');
  }, [visibleTabs]);

  const [isPrinting, setIsPrinting] = React.useState(false);

  // Mount print container, wait for render, then trigger print
  React.useEffect(() => {
    if (!isPrinting) {
      return;
    }
    // Use requestAnimationFrame to ensure the print div is painted before printing
    const frameId = requestAnimationFrame(() => {
      window.print();
      setIsPrinting(false);
    });
    return () => cancelAnimationFrame(frameId);
  }, [isPrinting]);

  const activeTab = visibleTabs.find((t) => t.key === activeTabKey);
  const ActiveComponent = activeTab?.component;

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
          selectedIndex={selectedIndex}
          onSelectModel={onSelectModel}
          onDownload={() => setIsPrinting(true)}
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
                Rank: {rank} | {String(model.context.model_config.eval_metric)}
              </p>
            </div>
            {visibleTabs.map((tab) => {
              const TabComponent = tab.component;
              return (
                <div key={tab.key} className="automl-print-page">
                  <Title headingLevel="h2">{tab.label}</Title>
                  <TabComponent
                    model={model}
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
