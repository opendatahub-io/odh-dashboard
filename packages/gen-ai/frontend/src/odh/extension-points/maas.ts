import type { CodeRef, Extension } from '@openshift/dynamic-plugin-sdk';
import type { ModArchRestCREATE, ModArchRestGET } from '~/app/types';

export type { ModArchRestCREATE, ModArchRestGET };

export interface MaaSModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  ready: boolean;
  url: string;
  // Optional fields for display name, description, and use case
  // These may not be provided by all backends, so we use id as fallback for display_name
  display_name?: string;
  description?: string;
  usecase?: string;
}

export type MaaSTokenRequest = {
  name?: string;
  description?: string;
  expiration?: string; // Optional - only present when expiration is provided
};
export interface MaaSTokenResponse {
  token: string;
  expiresAt: number;
}

export const isMaaSModelsExtension = (extension: Extension): extension is MaaSModelsExtension =>
  extension.type === 'gen-ai.maas/models';
export type MaaSModelsExtension = Extension<
  'gen-ai.maas/models',
  {
    getMaaSModels: CodeRef<ModArchRestGET<MaaSModel[]>>;
  }
>;

export const isGenerateMaaSTokenExtension = (
  extension: Extension,
): extension is GenerateMaaSTokenExtension => extension.type === 'gen-ai.maas/generate-token';
export type GenerateMaaSTokenExtension = Extension<
  'gen-ai.maas/generate-token',
  {
    generateMaaSToken: CodeRef<ModArchRestCREATE<MaaSTokenResponse, MaaSTokenRequest>>;
  }
>;
