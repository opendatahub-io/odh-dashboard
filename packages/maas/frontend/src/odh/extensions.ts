import MODEL_SERVING_EXTENSIONS, {
  type ModelServingExtensions,
} from './modelServingExtensions/modelServingExtensions';
import ODH_EXTENSIONS, { type ODHExtensions } from './odhExtensions/odhExtensions';
import GEN_AI_EXTENSIONS, { type GenAiExtensions } from './genAiExtensions/genAiExtensions';

const extensions: (ODHExtensions | ModelServingExtensions | GenAiExtensions)[] = [
  ...ODH_EXTENSIONS,
  ...MODEL_SERVING_EXTENSIONS,
  ...GEN_AI_EXTENSIONS,
];

export default extensions;
