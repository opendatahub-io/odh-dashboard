import React from 'react';
import { CardTitle, Tooltip } from '@patternfly/react-core';
import { OdhApplication } from '../types';
import { isRedHatSupported } from '../utilities/utils';
import { ODH_PRODUCT_NAME } from 'utilities/const';

type SupportedAppTitleProps = {
  odhApp: OdhApplication;
  showProvider?: boolean;
};

const SupportedAppTitle: React.FC<SupportedAppTitleProps> = ({ odhApp, showProvider = false }) => {
  const { title, icon } = React.useMemo(() => {
    const split = odhApp.spec.displayName?.split(' ');

    if (isRedHatSupported(odhApp)) {
      return {
        title: `${split.slice(0, -1).join(' ')} `,
        icon: (
          <span style={{ whiteSpace: 'nowrap' }}>
            <span style={{ verticalAlign: 'text-bottom' }}>{split.pop()}</span>
            <Tooltip removeFindDomNode content={`${ODH_PRODUCT_NAME} certified and supported`}>
              <img
                style={{ marginLeft: 'var(--pf-global--spacer--xs)' }}
                src="../images/CheckStar.svg"
                alt={`${ODH_PRODUCT_NAME} certified and supported`}
              />
            </Tooltip>
          </span>
        ),
      };
    } else {
      return { title: odhApp.spec.displayName };
    }
  }, [odhApp]);

  return (
    <CardTitle>
      <span style={{ verticalAlign: 'text-bottom' }}>{title}</span>
      {icon}
      {showProvider && odhApp.spec.provider && (
        <div>
          <span className="odh-card__provider">by {odhApp.spec.provider}</span>
        </div>
      )}
    </CardTitle>
  );
};

export default SupportedAppTitle;
