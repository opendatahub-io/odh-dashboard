import * as React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import ModelServingContextProvider from './ModelServingContext';
import GlobalInferenceMetricsWrapper from './screens/metrics/GlobalInferenceMetricsWrapper';
import ModelServingGlobal from './screens/global/ModelServingGlobal';
import useModelMetricsEnabled from './useModelMetricsEnabled';

const ModelServingRoutes: React.FC = () => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();

  /*
   * TODO: Add deep linking to metrics tabs
   *  - useNavigate hook is useful here.
   *  - useParams hook to get data. (from React Router DOM)
   *  - Project page and modelserving page.
   *  - Based on tab value from useParams set the active tab, remove the useState hook as variable is now stored in URL.
   *  - ChangeURL comes from useNavigate - so update URL instead of changing state.
   */
  return (
    <Routes>
      <Route path="/" element={<ModelServingContextProvider />}>
        <Route index element={<ModelServingGlobal />} />
        <Route
          path="/metrics/:project/:inferenceService/:tab?"
          element={
            modelMetricsEnabled ? <GlobalInferenceMetricsWrapper /> : <Navigate replace to="/" />
          }
        />
        {/* TODO: Global Runtime metrics?? */}
        <Route path="*" element={<Navigate to="." />} />
      </Route>
    </Routes>
  );
};

export default ModelServingRoutes;
