import React from 'react';
import { Label, Popover } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import type { HfAccessLabelVariant } from '~/app/pages/modelCatalog/utils/modelCatalogUtils';
import { MODEL_CATALOG_POPOVER_MESSAGES } from '~/concepts/modelCatalog/const';

type ModelCatalogAccessLabelProps = {
  variant: HfAccessLabelVariant;
  onLabelClick?: () => void;
};

const ModelCatalogAccessLabel: React.FC<ModelCatalogAccessLabelProps> = ({
  variant,
  onLabelClick,
}) => {
  if (variant === 'private') {
    return (
      <Popover bodyContent={MODEL_CATALOG_POPOVER_MESSAGES.HF_PRIVATE}>
        <Label isClickable data-testid="model-catalog-access-label-private" onClick={onLabelClick}>
          Private
        </Label>
      </Popover>
    );
  }

  if (variant === 'gated-denied') {
    return (
      <Popover bodyContent={MODEL_CATALOG_POPOVER_MESSAGES.HF_GATED_ACCESS_DENIED}>
        <Label
          variant="outline"
          isClickable
          status="warning"
          icon={<ExclamationTriangleIcon />}
          data-testid="model-catalog-access-label-gated-denied"
          onClick={onLabelClick}
        >
          Gated
        </Label>
      </Popover>
    );
  }

  return (
    <Popover bodyContent={MODEL_CATALOG_POPOVER_MESSAGES.HF_GATED}>
      <Label isClickable data-testid="model-catalog-access-label-gated" onClick={onLabelClick}>
        Gated
      </Label>
    </Popover>
  );
};

export default ModelCatalogAccessLabel;
