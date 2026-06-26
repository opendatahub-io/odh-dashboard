import * as React from 'react';
import { Alert, Bullseye, Flex, PageSection, Spinner } from '@patternfly/react-core';
import { useSubscriptionPolicyFormData } from '~/app/hooks/useSubscriptionPolicyFormData';
import { buildModelOverviewRows } from './overview/utils';
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
        <Flex justifyContent={{ default: 'justifyContentFlexEnd' }} className="pf-v6-u-mb-md" />
      )}
      <OverviewTable data={rows} />
    </PageSection>
  );
};

export default OverviewTab;
