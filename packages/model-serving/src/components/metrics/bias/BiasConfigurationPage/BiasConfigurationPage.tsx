import * as React from 'react';
import { Breadcrumb, Button, EmptyStateVariant, PageSection } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { BreadcrumbItemType } from '@odh-dashboard/internal/types';
import { useModelBiasData } from '@odh-dashboard/internal/concepts/trustyai/context/useModelBiasData';
import { getBreadcrumbItemComponents } from '../../utils';
import ManageBiasConfigurationModal from './BiasConfigurationModal/ManageBiasConfigurationModal';
import { MetricsTabKeys } from '../../types';
import { TrustyInstallState } from '@odh-dashboard/internal/concepts/trustyai/types';
import BiasConfigurationTable from './BiasConfigurationTable';
import BiasConfigurationEmptyState from './BiasConfigurationEmptyState';

type BiasConfigurationPageProps = {
  breadcrumbItems: BreadcrumbItemType[];
  inferenceService: InferenceServiceKind;
};

const BiasConfigurationPage: React.FC<BiasConfigurationPageProps> = ({
  breadcrumbItems,
  inferenceService,
}) => {
  const { biasMetricConfigs, statusState, refresh } = useModelBiasData();
  const firstRender = React.useRef(true);
  const [isOpen, setOpen] = React.useState(false);

  const isInstalled = statusState.type === TrustyInstallState.INSTALLED;
  React.useEffect(() => {
    if (isInstalled) {
      if (firstRender.current) {
        firstRender.current = false;
        if (biasMetricConfigs.length === 0) {
          setOpen(true);
        }
      }
    }
  }, [biasMetricConfigs, isInstalled]);

  return (
    <>
      <ApplicationsPage
        title="Bias metric configuration"
        description="Manage the configuration of model bias metrics."
        breadcrumb={<Breadcrumb>{getBreadcrumbItemComponents(breadcrumbItems)}</Breadcrumb>}
        headerAction={
          <Button
            component={(props) => (
              <Link {...props} to={`../${MetricsTabKeys.BIAS}`} relative="path" />
            )}
          >
            {biasMetricConfigs.length === 0
              ? `Back to ${getDisplayNameFromK8sResource(inferenceService)}`
              : 'View metrics'}
          </Button>
        }
        loaded={isInstalled}
        provideChildrenPadding
        empty={biasMetricConfigs.length === 0}
        emptyStatePage={
          <PageSection hasBodyWrapper={false} isFilled>
            <BiasConfigurationEmptyState
              actionButton={<Button onClick={() => setOpen(true)}>Configure metric</Button>}
              variant={EmptyStateVariant.lg}
            />
          </PageSection>
        }
      >
        <BiasConfigurationTable
          inferenceService={inferenceService}
          onConfigure={() => setOpen(true)}
        />
      </ApplicationsPage>
      {isOpen ? (
        <ManageBiasConfigurationModal
          onClose={(submit) => {
            if (submit) {
              refresh();
            }
            setOpen(false);
          }}
          inferenceService={inferenceService}
        />
      ) : null}
    </>
  );
};

export default BiasConfigurationPage;
