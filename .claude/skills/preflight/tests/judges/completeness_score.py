"""Judge: Did all preflight tasks complete?

Returns boolean — yes if all created tasks reached completed status,
no otherwise. The rationale lists which tasks completed and which didn't.
"""

from mlflow.entities import Feedback, SpanType
from mlflow.genai.scorers import scorer


def get_judges():
    @scorer(name="completeness-score")
    def completeness_score(trace) -> Feedback:
        tool_spans = trace.search_spans(span_type=SpanType.TOOL)

        created = {}
        completed_ids = set()

        for span in tool_spans:
            inputs = span.inputs or {}

            if "TaskCreate" in span.name:
                outputs = span.outputs or {}
                result = str(outputs.get("result", ""))
                subject = inputs.get("subject", "")
                if "Task #" in result:
                    parts = result.split("Task #", 1)
                    if len(parts) > 1 and parts[1]:
                        task_id = parts[1].split()[0] if parts[1].split() else ""
                        if task_id:
                            created[task_id] = subject

            if "TaskUpdate" in span.name:
                status = inputs.get("status", "")
                task_id = inputs.get("taskId")
                if status == "completed" and task_id is not None:
                    completed_ids.add(str(task_id))

        if not created:
            return Feedback(
                value="no",
                rationale="No tasks were created",
            )

        missing = {tid: name for tid, name in created.items() if tid not in completed_ids}
        done = {tid: name for tid, name in created.items() if tid in completed_ids}

        if not missing:
            names = [f"#{tid} {name}" for tid, name in done.items()]
            return Feedback(
                value="yes",
                rationale=f"All {len(done)} tasks completed: {'; '.join(names)}",
            )

        done_names = [f"#{tid} {name}" for tid, name in done.items()]
        missing_names = [f"#{tid} {name}" for tid, name in missing.items()]
        return Feedback(
            value="no",
            rationale=f"Completed: {'; '.join(done_names) or 'none'}. Missing: {'; '.join(missing_names)}",
        )

    return [completeness_score]
