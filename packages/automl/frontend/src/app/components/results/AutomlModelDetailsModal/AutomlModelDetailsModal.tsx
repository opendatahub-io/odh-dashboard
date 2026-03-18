import React from 'react';
import {
  Button,
  Grid,
  GridItem,
  Modal,
  ModalBody,
  ModalHeader,
  Popover,
  Tab,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import type { ModelArtifact, FeatureImportanceData, ConfusionMatrixData } from '~/app/types';
import { getVisibleTabs, type TabDefinition } from './tabConfig';
import AutomlModelDetailsModalHeader from './AutomlModelDetailsModalHeader';
import './AutomlModelDetailsModal.css';

type AutomlModelDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  artifact: ModelArtifact;
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
  artifact,
  rank,
}) => {
  const visibleTabs = React.useMemo(
    () => getVisibleTabs(artifact.context.task_type),
    [artifact.context.task_type],
  );
  const [activeTabKey, setActiveTabKey] = React.useState(visibleTabs[0]?.key ?? '');
  const groupedTabs = React.useMemo(() => groupTabsBySection(visibleTabs), [visibleTabs]);

  // TODO: Replace with real S3 fetch using artifact.context.location
  const [featureImportance] = React.useState<FeatureImportanceData | undefined>(undefined);
  const [confusionMatrix] = React.useState<ConfusionMatrixData | undefined>(undefined);

  // Reset active tab when artifact changes
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
    >
      <ModalHeader title={artifact.display_name} labelId="automl-model-details-title" />
      <ModalBody>
        <AutomlModelDetailsModalHeader artifact={artifact} rank={rank} />
        <Grid hasGutter>
          <GridItem span={3} className="automl-model-details-sidebar">
            {[...groupedTabs.entries()].map(([section, tabs]) => (
              <React.Fragment key={section}>
                <div className="automl-model-details-sidebar-section">{section}</div>
                <Tabs
                  isVertical
                  activeKey={activeTabKey}
                  onSelect={(_e, key) => setActiveTabKey(String(key))}
                  aria-label={`${section} tabs`}
                >
                  {tabs.map((tab) => (
                    <Tab
                      key={tab.key}
                      eventKey={tab.key}
                      title={<TabTitleText>{tab.label}</TabTitleText>}
                      data-testid={`tab-${tab.key}`}
                    />
                  ))}
                </Tabs>
              </React.Fragment>
            ))}
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
                {ActiveComponent && (
                  <ActiveComponent
                    artifact={artifact}
                    featureImportance={featureImportance}
                    confusionMatrix={confusionMatrix}
                  />
                )}
              </>
            )}
          </GridItem>
        </Grid>
      </ModalBody>
    </Modal>
  );
};

export default AutomlModelDetailsModal;
