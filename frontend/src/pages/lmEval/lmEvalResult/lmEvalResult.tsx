import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, Button } from '@patternfly/react-core';
import { Link } from 'react-router';
import { LMEvalContext } from '#~/pages/lmEval/global/LMEvalContext';
import { downloadString } from '#~/utilities/string';
import LMEvalResultApplicationPage from '#~/pages/lmEval/components/LMEvalResultApplicationPage';
import LMEvalResultTable from './LMEvalResultTable';
import { parseEvaluationResults } from './utils';

const LMEvalResult: React.FC = () => {
  const { evaluationName } = useParams<{ evaluationName: string }>();
  const { lmEval } = React.useContext(LMEvalContext);

  // Find the specific evaluation by name
  const evaluation = React.useMemo(
    () => lmEval.data.find((item) => item.metadata.name === evaluationName),
    [lmEval.data, evaluationName],
  );

  // Parse results only when evaluation or results change
  const results = React.useMemo(
    () => (evaluation?.status?.results ? parseEvaluationResults(evaluation.status.results) : []),
    [evaluation?.status?.results],
  );

  // Common breadcrumb component
  const breadcrumb = React.useMemo(
    () => (
      <Breadcrumb>
        <BreadcrumbItem render={() => <Link to="/modelEvaluations">Model evaluations</Link>} />
        <BreadcrumbItem isActive>{evaluation?.metadata.name || evaluationName}</BreadcrumbItem>
      </Breadcrumb>
    ),
    [evaluation?.metadata.name, evaluationName],
  );

  const handleDownload = React.useCallback(() => {
    if (evaluation?.status?.results) {
      try {
        // Parse the results string to get the actual results object
        const resultsObject = JSON.parse(evaluation.status.results);
        const rawData = JSON.stringify(resultsObject, null, 2);
        downloadString(`${evaluation.metadata.name}-results.json`, rawData);
      } catch {
        // Fallback to downloading the raw results string if parsing fails
        downloadString(`${evaluation.metadata.name}-results.txt`, evaluation.status.results);
      }
    }
  }, [evaluation]);

  // Handle evaluation not found
  if (!evaluation) {
    return (
      <LMEvalResultApplicationPage
        loaded
        empty
        emptyMessage={`Evaluation "${evaluationName || 'Unknown'}" not found`}
        title="Evaluation Results"
      />
    );
  }

  // Handle no results available
  if (results.length === 0) {
    const emptyMessage = evaluation.status?.results
      ? 'Unable to parse evaluation results'
      : 'Evaluation results not yet available';

    return (
      <LMEvalResultApplicationPage
        loaded={lmEval.loaded}
        empty
        emptyMessage={emptyMessage}
        title={evaluation.metadata.name}
        breadcrumb={breadcrumb}
      />
    );
  }

  // Show results with download button
  return (
    <LMEvalResultApplicationPage
      loaded={lmEval.loaded}
      empty={false}
      loadError={lmEval.error}
      title={evaluation.metadata.name}
      breadcrumb={breadcrumb}
      headerAction={
        <Button variant="primary" onClick={handleDownload}>
          Download JSON
        </Button>
      }
      provideChildrenPadding
    >
      <LMEvalResultTable results={results} />
    </LMEvalResultApplicationPage>
  );
};

export default LMEvalResult;
