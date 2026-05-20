# Marketplace Smoke

Use this skill to verify that a local Hallow skill package can pass marketplace alpha checks and install into a runtime.

## Inputs

- prompt
- local memory
- runtime constraints

## Workflow

1. Read the prompt.
2. Check relevant memory when useful.
3. Produce a concise local-only result.
4. Record a small learning note when the run reveals a reusable workflow.

## Quality Bar

- No terminal execution.
- No external sends.
- No broad filesystem writes.
- Keep output short and auditable.

## Failure Handling

- If context is missing, state what is missing and produce a safe local draft.
