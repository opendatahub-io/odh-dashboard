import React from 'react';
import classNames from 'classnames';
import { Bullseye, CardTitle, Flex, FlexItem, Tooltip } from '@patternfly/react-core';
import { OdhApplication } from '../types';
import { isRedHatSupported } from '../utilities/utils';
import { ODH_PRODUCT_NAME } from 'utilities/const';

type SupportedAppTitleProps = {
  odhApp: OdhApplication;
  showProvider?: boolean;
};

const SupportedAppTitle: React.FC<SupportedAppTitleProps> = ({ odhApp, showProvider = false }) => {
  const supportedImageClasses = classNames('odh-card__supported-image', {
    'm-hidden': !isRedHatSupported(odhApp),
  });
  return (
    <CardTitle>
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>{odhApp.spec.displayName}</FlexItem>
        <FlexItem>
          {/* We still have some layout issue after applying removeFindDomNode
          Use Bullseye layout to temp fix it, here is the PF issue to track 
          https://github.com/patternfly/patternfly-react/issues/8277 */}
          <Tooltip removeFindDomNode content={`${ODH_PRODUCT_NAME} certified and supported`}>
            <Bullseye>
              <img
                className={supportedImageClasses}
                src="../images/CheckStar.svg"
                alt={`${ODH_PRODUCT_NAME} certified and supported`}
              />
            </Bullseye>
          </Tooltip>
        </FlexItem>
      </Flex>
      {showProvider && odhApp.spec.provider ? (
        <div>
          <span className="odh-card__provider">by {odhApp.spec.provider}</span>
        </div>
      ) : null}
    </CardTitle>
  );
};

export default SupportedAppTitle;
