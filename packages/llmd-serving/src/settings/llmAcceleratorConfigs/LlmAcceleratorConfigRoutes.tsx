import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import { verbModelAccess } from '@odh-dashboard/internal/concepts/userSSAR/utils';
import NotFound from '@odh-dashboard/internal/pages/NotFound';
import LlmAcceleratorConfigContextProvider from './LlmAcceleratorConfigContext';
import LlmAcceleratorConfigView from './LlmAcceleratorConfigView';
import LlmAcceleratorConfigAddForm, {
  LlmAcceleratorConfigEditForm,
  LlmAcceleratorConfigDuplicateForm,
} from './LlmAcceleratorConfigAddForm';
import { LLMInferenceServiceConfigModel } from '../../types';

const LlmAcceleratorConfigRoutesInner: React.FC = () => (
  <Routes>
    <Route path="/" element={<LlmAcceleratorConfigContextProvider />}>
      <Route index element={<LlmAcceleratorConfigView />} />
      <Route path="add" element={<LlmAcceleratorConfigAddForm mode="add" />} />
      <Route path="edit/:configName" element={<LlmAcceleratorConfigEditForm />} />
      <Route path="duplicate/:configName" element={<LlmAcceleratorConfigDuplicateForm />} />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </Routes>
);

const LlmAcceleratorConfigRoutes: React.FC = () => {
  const [canCreate, createLoaded] = useAccessAllowed(
    verbModelAccess('create', LLMInferenceServiceConfigModel),
  );
  const [canPatch, patchLoaded] = useAccessAllowed(
    verbModelAccess('patch', LLMInferenceServiceConfigModel),
  );

  if (!createLoaded || !patchLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!canCreate || !canPatch) {
    return <NotFound />;
  }

  return <LlmAcceleratorConfigRoutesInner />;
};

export default LlmAcceleratorConfigRoutes;
