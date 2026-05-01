# Documentation Quality Judge

Evaluate the generated documentation against the reference and the project's documentation guidelines.

## Scoring Rubric

### 5 — Excellent
- All relevant sections present with accurate, detailed content
- Follows docs/guidelines.md conventions precisely
- No placeholder text, no filler sections
- Under 300 lines
- At least 1 concrete dependency in Interactions section
- Would be useful to a new developer immediately

### 4 — Good
- Covers key sections with accurate content
- Minor gaps (e.g., missing one optional section)
- Follows conventions with minor deviations
- Practical and useful

### 3 — Acceptable
- Core content is present but incomplete
- Some sections lack depth or detail
- Mostly follows conventions
- Usable but would benefit from editing

### 2 — Below Average
- Significant gaps in content
- Inaccurate descriptions of code or architecture
- Convention violations
- Limited practical usefulness

### 1 — Poor
- Mostly placeholder or generic content
- Major inaccuracies
- Does not follow project conventions
- Not useful to a developer

## Key Quality Signals

- **Template adherence**: Did the skill select and follow the right template?
- **Source research**: Does the content reflect actual code, not generic descriptions?
- **Interactions section**: Names at least 1 concrete dependency
- **No filler**: Every section has real content or is omitted entirely
- **Line count**: Under 300 lines (hard limit 500)
