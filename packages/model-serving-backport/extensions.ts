import type { ModelServingPlatformExtension } from '@odh-dashboard/model-serving/extension-points';

// NIM platform registration has moved to @odh-dashboard/nim-serving.
// This file is kept so the package remains a valid plugin (has ./extensions export).
const extensions: ModelServingPlatformExtension[] = [];

export default extensions;
