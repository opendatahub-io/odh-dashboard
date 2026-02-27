import MODEL_SERVING_EXTENSIONS, {
  type ModelServingExtensions,
} from './modelServingExtensions/modelServingExtensions';
import ODH_EXTENSIONS, { type ODHExtensions } from './odhExtensions/odhExtensions';

const extensions: (ODHExtensions | ModelServingExtensions)[] = [
  ...ODH_EXTENSIONS,
  ...MODEL_SERVING_EXTENSIONS,
];

export default extensions;
