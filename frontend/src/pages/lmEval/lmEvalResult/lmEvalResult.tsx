import * as React from 'react';
import { useParams } from 'react-router-dom';
import { LMEvalContext } from '#~/pages/lmEval/global/LMEvalContext';

const LMEvalResult: React.FC = () => {
  const { evaluationName } = useParams<{ evaluationName: string }>();
  const { lmEval } = React.useContext(LMEvalContext);

  // Find the specific evaluation by name
  const evaluation = lmEval.data.find((lmEvalItem) => lmEvalItem.metadata.name === evaluationName);

  if (!evaluation) {
    return <div>Evaluation not found</div>;
  }

  return (
    <div>
      <h1>Results for: {evaluation.metadata.name}</h1>
      <p>Status: {evaluation.status?.state || 'Unknown'}</p>
      <p>Model: {evaluation.spec.modelArgs?.find((arg) => arg.name === 'model')?.value || '-'}</p>
      {/* Add more result details here */}
    </div>
  );
};

export default LMEvalResult;
