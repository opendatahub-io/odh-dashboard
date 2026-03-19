import React from 'react';
import {
  Button,
  Grid,
  GridItem,
  Modal,
  ModalBody,
  ModalHeader,
  Popover,
  Title,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import type { ModelArtifact, FeatureImportanceData, ConfusionMatrixData } from '~/app/types';
import { getVisibleTabs, type TabDefinition } from './tabConfig';
import AutomlModelDetailsModalHeader from './AutomlModelDetailsModalHeader';
import './AutomlModelDetailsModal.scss';

type AutomlModelDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  model: ModelArtifact;
  rank: number;
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
  model,
  rank,
  createdAt,
  featureImportance,
  confusionMatrix,
}) => {
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
      <ModalHeader title={model.display_name} labelId="automl-model-details-title" />
      <ModalBody>
        <AutomlModelDetailsModalHeader model={model} rank={rank} />
        <Grid hasGutter>
          <GridItem span={3} className="automl-model-details-sidebar">
            <nav aria-label="Model details navigation">
              {[...groupedTabs.entries()].map(([section, tabs]) => (
                <div key={section}>
                  <div className="automl-model-details-sidebar-section">{section}</div>
                  <ul className="automl-model-details-nav-list">
                    {tabs.map((tab) => (
                      <li key={tab.key}>
                        <button
                          type="button"
                          className={`automl-model-details-nav-item${activeTabKey === tab.key ? ' automl-model-details-nav-item--active' : ''}`}
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
          <GridItem span={9}>
            {activeTab && (
              <>
                <div className="automl-model-details-tab-title">
                  <Title headingLevel="h2">{activeTab.label}</Title>
                  <Popover bodyContent={activeTab.tooltip}>
                    <Button
                      variant="plain"
                      aria-label={`${activeTab.label} info`}
                      icon={<OutlinedQuestionCircleIcon />}
                    />
                  </Popover>
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
      </ModalBody>
    </Modal>
  );
};

export default AutomlModelDetailsModal;
