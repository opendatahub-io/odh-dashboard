import * as React from 'react';
import {
  Alert,
  Bullseye,
  Flex,
  FlexItem,
  PageSection,
  Spinner,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import { useSubscriptionPolicyFormData } from '~/app/hooks/useSubscriptionPolicyFormData';
import { buildModelOverviewRows } from './overview/columns';
import OverviewTable from './overview/OverviewTable';

const OverviewTab: React.FC = () => {
  const [formData, loaded, error] = useSubscriptionPolicyFormData();

  const rows = React.useMemo(() => buildModelOverviewRows(formData), [formData]);

  if (!loaded && !error) {
    return (
      <PageSection isFilled>
        <Bullseye>
          <Spinner />
        </Bullseye>
      </PageSection>
    );
  }

  if (error) {
    return (
      <PageSection isFilled>
        <Alert variant="danger" isInline title="Error loading overview data">
          {error.message}
        </Alert>
      </PageSection>
    );
  }

  return (
    <PageSection isFilled>
      {rows.length > 0 && (
        <Flex justifyContent={{ default: 'justifyContentFlexEnd' }} className="pf-v6-u-mb-md">
          <FlexItem>
            <ToggleGroup aria-label="View toggle" data-testid="overview-view-toggle">
              <ToggleGroupItem
                text="Model view"
                buttonId="model-view"
                isSelected
                data-testid="model-view-toggle"
              />
              <ToggleGroupItem
                text="Group view"
                buttonId="group-view"
                isSelected={false}
                isDisabled
                data-testid="group-view-toggle"
              />
            </ToggleGroup>
          </FlexItem>
        </Flex>
      )}
      <OverviewTable data={rows} />
    </PageSection>
  );
};

export default OverviewTab;
