import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Flex, FlexItem } from '@patternfly/react-core';
import { CogIcon } from '@patternfly/react-icons';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import { verbModelAccess } from '@odh-dashboard/internal/concepts/userSSAR/utils';
import FeatureStoreProjectSelector from './FeatureStoreProjectSelector';
import { useFeatureStoreObject } from '../../apiHooks/useFeatureStoreObject';
import { FeatureStoreObject } from '../../const';
import { useFeatureStoreProject } from '../../FeatureStoreContext';

type FeatureStoreProjectSelectorNavigatorProps = {
  getRedirectPath: (featureStoreObject: FeatureStoreObject, featureStoreProject?: string) => string;
};

const FeatureStoreProjectSelectorNavigator: React.FC<FeatureStoreProjectSelectorNavigatorProps> = ({
  getRedirectPath,
}) => {
  const navigate = useNavigate();
  const currentFeatureStoreObject = useFeatureStoreObject();
  const { currentProject, updatePreferredFeatureStoreProject } = useFeatureStoreProject();
  const [canManage] = useAccessAllowed(verbModelAccess('list', FeatureStoreModel));

  return (
    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
      <FlexItem>
        <FeatureStoreProjectSelector
          onSelection={(featureStoreObject: FeatureStoreObject, featureStoreProject?: string) => {
            updatePreferredFeatureStoreProject(featureStoreProject || null);
            navigate(getRedirectPath(featureStoreObject, featureStoreProject));
          }}
          featureStoreProject={currentProject ?? ''}
          featureStoreObject={currentFeatureStoreObject}
        />
      </FlexItem>
      {canManage && (
        <FlexItem>
          <Button
            variant="link"
            icon={<CogIcon />}
            component={(props: React.ComponentProps<'a'>) => (
              <Link {...props} to="/develop-train/feature-store/manage" />
            )}
            data-testid="manage-feature-stores-link"
          >
            Manage feature stores
          </Button>
        </FlexItem>
      )}
    </Flex>
  );
};

export default FeatureStoreProjectSelectorNavigator;
