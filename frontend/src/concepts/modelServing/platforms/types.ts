import * as React from 'react';
import { SupportedServingPlatform } from '~/concepts/modelServing/platforms/const';
import { ProjectKind } from '~/k8sTypes';

export type ServingExport<Render> = Record<SupportedServingPlatform, Render>;

export type DetermineServingPlatform = (project: ProjectKind) => boolean;

export type ServingAvailable = () => boolean;

export type SelectServingCard = React.FC<{ resetButton: React.ReactNode }>;
