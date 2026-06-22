"""Judge: Did the agent post a PR review?

Searches TOOL spans for a Bash call containing 'gh api' and 'reviews'.
This is the command that posts a PR review via the GitHub API.
"""

from mlflow.entities import Feedback, SpanType
from mlflow.genai.scorers import scorer


def get_judges():
    @scorer(name="posted-review")
    def posted_review(trace) -> Feedback:
        tool_spans = trace.search_spans(span_type=SpanType.TOOL)
        for span in tool_spans:
            inputs = span.inputs or {}
            cmd = inputs.get("command", "")
            if "reviews" in cmd and "gh api" in cmd and "--input" in cmd:
                return Feedback(
                    value="yes",
                    rationale=f"Found review post command: {cmd[:200]}",
                )
        return Feedback(
            value="no",
            rationale="No 'gh api repos/.../reviews' call found in any tool span",
        )

    return [posted_review]
