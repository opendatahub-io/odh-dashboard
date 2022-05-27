import React from 'react';
import classNames from 'classnames';
import { CardTitle, Tooltip } from '@patternfly/react-core';
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
      <span className="odh-card__title-supported">
        {odhApp.spec.displayName}
        <Tooltip content={`${ODH_PRODUCT_NAME} certified and supported`}>
          <img
            className={supportedImageClasses}
            src="../images/CheckStar.svg"
            alt={`${ODH_PRODUCT_NAME} certified and supported`}
          />
        </Tooltip>
      </span>
      {showProvider && odhApp.spec.provider ? (
        <div>
          <span className="odh-card__provider">by {odhApp.spec.provider}</span>
        </div>
      ) : null}
    </CardTitle>
  );
};

export default SupportedAppTitle;
