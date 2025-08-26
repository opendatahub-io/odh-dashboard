import * as React from 'react';
import { Tab, Tabs, TabTitleText, TabContentBody } from '@patternfly/react-core';
import TrainingJobLogsTab from './TrainingJobLogsTab';
import { PyTorchJobKind } from '../../k8sTypes';

enum TrainingJobDetailsTab {
  LOGS = 'Logs',
  DETAILS = 'Details',
}

type TrainingJobDetailsTabsProps = {
  job: PyTorchJobKind;
};

const TrainingJobDetailsTabs: React.FC<TrainingJobDetailsTabsProps> = ({ job }) => {
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(
    TrainingJobDetailsTab.LOGS,
  );

  return (
    <Tabs
      activeKey={activeTabKey}
      aria-label="Training job details page"
      role="region"
      data-testid="training-job-details-page"
      onSelect={(e, tabIndex) => {
        setActiveTabKey(tabIndex);
      }}
    >
      <Tab
        eventKey={TrainingJobDetailsTab.LOGS}
        title={<TabTitleText>{TrainingJobDetailsTab.LOGS}</TabTitleText>}
        aria-label="Training job logs tab"
        data-testid="training-job-logs-tab"
      >
        <TabContentBody hasPadding>
          <TrainingJobLogsTab job={job} />
        </TabContentBody>
      </Tab>
      <Tab
        eventKey={TrainingJobDetailsTab.DETAILS}
        title={<TabTitleText>{TrainingJobDetailsTab.DETAILS}</TabTitleText>}
        aria-label="Training job details tab"
        data-testid="training-job-details-tab"
      >
        <TabContentBody>
          <div>Training job details will be implemented here.</div>
        </TabContentBody>
      </Tab>
    </Tabs>
  );
};

export default TrainingJobDetailsTabs;
