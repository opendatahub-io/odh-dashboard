import { zodResolver } from '@hookform/resolvers/zod';
import { createFormControl } from 'react-hook-form';
import Experiment from '../schemas/experiment.schema';

const experimentForm = createFormControl({
  mode: 'onChange',
  resolver: zodResolver(Experiment),
});

export default experimentForm;
