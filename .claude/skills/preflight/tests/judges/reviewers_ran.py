"""Judge: Did the agent run code reviewers?

The preflight skill spawns subagents for code review. This judge checks
that at least one review Agent span exists in the trace (e.g., "Claude
code review", "Style review", "RBAC review").
"""

from mlflow.entities import Feedback, SpanType
from mlflow.genai.scorers import scorer

REVIEW_KEYWORDS = ["review", "audit", "angle"]


def get_judges():
    @scorer(name="reviewers-ran")
    def reviewers_ran(trace) -> Feedback:
        tool_spans = trace.search_spans(span_type=SpanType.TOOL)
        found = []

        for span in tool_spans:
            inputs = span.inputs or {}
            desc = inputs.get("description", "")
            if any(kw in desc.lower() for kw in REVIEW_KEYWORDS):
                found.append(desc[:80])

        if found:
            return Feedback(
                value="yes",
                rationale=f"Found {len(found)} reviewer(s): {'; '.join(found)}",
            )

        return Feedback(
            value="no",
            rationale="No review Agent spans found in trace",
        )

    return [reviewers_ran]
