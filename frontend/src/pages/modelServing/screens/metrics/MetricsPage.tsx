import * as React from 'react';
import { Breadcrumb, Button } from '@patternfly/react-core';
import { useNavigate, useParams } from 'react-router-dom';
import { CogIcon } from '@patternfly/react-icons';
import { BreadcrumbItemType } from '#~/types';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import MetricsPageTabs from '#~/pages/modelServing/screens/metrics/MetricsPageTabs';
import { MetricsTabKeys } from '#~/pages/modelServing/screens/metrics/types';
import { TrustyAIContext } from '#~/concepts/trustyai/context/TrustyAIContext';
import { InferenceServiceKind } from '#~/k8sTypes';
import { TrustyInstallState } from '#~/concepts/trustyai/types';
import { getBreadcrumbItemComponents } from './utils';

type MetricsPageProps = {
  title: string;
  breadcrumbItems: BreadcrumbItemType[];
  model?: InferenceServiceKind;
};

const MetricsPage: React.FC<MetricsPageProps> = ({ title, breadcrumbItems, model }) => {
  const { tab } = useParams();
  const navigate = useNavigate();

  const { statusState } = React.useContext(TrustyAIContext);

  return (
    <ApplicationsPage
      title={title}
      breadcrumb={<Breadcrumb>{getBreadcrumbItemComponents(breadcrumbItems)}</Breadcrumb>}
      loaded
      description={null}
      empty={false}
      headerAction={
        tab === MetricsTabKeys.BIAS && (
          <Button
            isDisabled={statusState.type !== TrustyInstallState.INSTALLED}
            variant="link"
            icon={<CogIcon />}
            onClick={() => navigate('../configure', { replace: true })}
          >
            Configure
          </Button>
        )
      }
    >
      {model ? <MetricsPageTabs model={model} /> : null}
    </ApplicationsPage>
  );
};

export default MetricsPage;
