import React from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { useParams } from 'react-router';
import SecretSelector, { SecretSelection } from '~/app/components/common/SecretSelector';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import { useRunTriggeredTracking } from '~/app/context/RunTriggeredTrackingContext';
import {
  fireAutoragVectorStoreConfigured,
  toVectorStoreProviderTypeFromSecret,
  TrackingOutcome,
} from '~/app/utilities/tracking';

type AutoragVectorStoreSelectorProps = {
  initialSecret?: SecretSelection;
};

const AutoragVectorStoreSelector: React.FC<AutoragVectorStoreSelectorProps> = ({
  initialSecret,
}) => {
  const { namespace = '' } = useParams();
  const { onVectorStoreConfigured } = useRunTriggeredTracking();
  const {
    formState: { isSubmitting },
  } = useFormContext<ConfigureSchema>();
  const [selectedSecret, setSelectedSecret] = React.useState<SecretSelection | undefined>(
    initialSecret,
  );

  const {
    field: { onChange: fieldOnChange },
  } = useController<ConfigureSchema, 'vector_db_secret_name'>({
    name: 'vector_db_secret_name',
  });

  return (
    <SecretSelector
      dataTestId="vector-store-select-toggle"
      placeholder="Select vector database secret"
      type="vector-db"
      namespace={namespace}
      value={selectedSecret?.uuid}
      isDisabled={isSubmitting}
      onChange={(secret) => {
        setSelectedSecret(secret);
        fieldOnChange(!secret || secret.invalid ? '' : secret.name);
        const providerType = toVectorStoreProviderTypeFromSecret(secret?.type);
        if (secret && !secret.invalid && providerType) {
          fireAutoragVectorStoreConfigured({
            providerType,
            countOfCompatibleProviders: 1,
            outcome: TrackingOutcome.submit,
            success: true,
          });
          onVectorStoreConfigured(providerType);
        }
      }}
    />
  );
};

export default AutoragVectorStoreSelector;
