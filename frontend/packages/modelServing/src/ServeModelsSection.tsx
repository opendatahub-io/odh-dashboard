import React from 'react';
import { ModelServingPlatformProvider } from './concepts/ModelServingPlatformContext';
import ModelPlatformSection from './components/overview/ModelPlatformSection';

const ServeModelsSection: React.FC = () => (
  <ModelServingPlatformProvider>
    <ModelPlatformSection />
  </ModelServingPlatformProvider>
);

export default ServeModelsSection;
