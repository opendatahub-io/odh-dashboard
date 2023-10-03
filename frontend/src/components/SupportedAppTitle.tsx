import React from 'react';
import { Button, CardTitle, Tooltip } from '@patternfly/react-core';
import { OdhApplication } from '~/types';
import { isRedHatSupported } from '~/utilities/utils';
import { ODH_PRODUCT_NAME } from '~/utilities/const';

type SupportedAppTitleProps = {
  odhApp: OdhApplication;
  showProvider?: boolean;
  onClick?: () => void;
};

const SupportedAppTitle: React.FC<SupportedAppTitleProps> = ({
  odhApp,
  showProvider = false,
  onClick,
}) => {
  let title = odhApp.spec.displayName;
  let icon;

  if (isRedHatSupported(odhApp)) {
    const splitTitle = odhApp.spec.displayName.split(' ');
    title = `${splitTitle.slice(0, -1).join(' ')} `;
    icon = (
      <span style={{ whiteSpace: 'nowrap' }}>
        <Button variant="link" onClick={onClick} isInline style={{ verticalAlign: 'text-bottom' }}>
          {splitTitle[splitTitle.length - 1]}
        </Button>
        <Tooltip content={`${ODH_PRODUCT_NAME} certified and supported`}>
          <Button variant="plain" style={{ padding: 0 }}>
            <img
              style={{ marginLeft: 'var(--pf-v5-global--spacer--xs)' }}
              src="../images/CheckStar.svg"
              alt={`${ODH_PRODUCT_NAME} certified and supported`}
            />
          </Button>
        </Tooltip>
      </span>
    );
  }

  return (
    <CardTitle>
      {onClick ? (
        <Button variant="link" isInline onClick={onClick}>
          {title}
        </Button>
      ) : (
        title
      )}
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
