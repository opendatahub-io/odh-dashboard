import * as React from 'react';
import { UpdateObjectAtPropAndValue } from 'mod-arch-shared';
import { ManageSourceFormData } from '~/app/pages/modelCatalogSettings/useManageSourceData';
import { ModelCatalogAccessTokenClearOutcome } from '~/app/pages/modelCatalogSettings/tracking/modelCatalogSourcesTracking';
type CredentialsSectionProps = {
    formData: ManageSourceFormData;
    setData: UpdateObjectAtPropAndValue<ManageSourceFormData>;
    onValidate: () => Promise<void>;
    isValidating: boolean;
    validationError?: Error;
    isValidationSuccess: boolean;
    onClearValidationSuccess: () => void;
    hasExistingApiKey?: boolean;
    onClearCredentials?: () => Promise<void>;
    onAccessTokenClearOutcome?: (outcome: ModelCatalogAccessTokenClearOutcome) => void;
};
declare const CredentialsSection: React.FC<CredentialsSectionProps>;
export default CredentialsSection;
