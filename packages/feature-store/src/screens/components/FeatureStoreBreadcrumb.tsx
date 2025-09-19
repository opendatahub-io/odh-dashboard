import * as React from 'react';
import { BreadcrumbItem, Flex, FlexItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { featureStoreRootRoute } from '../../routes';
import FeatureStoreIcon from '../../icons/header-icons/FeatureStoreIcon';
import './FeatureStoreBreadcrumb.scss';

type FeatureStoreBreadcrumbProps = {
  pageName: string;
  projectName: string;
  linkTo?: string;
  dataTestId?: string;
};

const FeatureStoreBreadcrumb: React.FC<FeatureStoreBreadcrumbProps> = ({
  pageName,
  projectName,
  linkTo = featureStoreRootRoute(),
  dataTestId,
}) => {
  return (
    <BreadcrumbItem
      data-testid={dataTestId}
      render={() => (
        <Link to={linkTo} className="fs-link-button-with-icon">
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsXs' }}
          >
            <FlexItem>{pageName} in</FlexItem>
            <FeatureStoreIcon style={{ width: '1rem', height: '1rem' }} />
            <FlexItem>{projectName}</FlexItem>
          </Flex>
        </Link>
      )}
    />
  );
};

export default FeatureStoreBreadcrumb;
