# Contributing to Hallow

Hallow is building a local-first Agent OS: a runtime where models, memory, tools, policy, approvals, traces, and recovery are separate, inspectable layers.

## Before opening a change

1. Search existing issues and pull requests.
2. Keep the change focused on one problem or capability.
3. Describe the user impact and the trust boundary it affects.
4. Never commit credentials, prompts, private memory, runtime state, wallet secrets, or developer infrastructure details.

## Development setup

```bash
git clone https://github.com/Hallow-agent/Hallow.git
cd Hallow
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm build
```

Use a development runtime home so test data never mixes with a normal installation:

```bash
corepack pnpm hallow --home .hallow-dev setup
corepack pnpm hallow --home .hallow-dev start
```

## Required validation

```bash
corepack pnpm test
corepack pnpm installer:check
corepack pnpm audit:prod
```

Changes to security, approvals, sandboxing, installers, model tool calls, memory persistence, or Guardian policy should include focused tests.

## Pull requests

A useful pull request explains:

- what changed;
- why the change is needed;
- which runtime or trust boundary is affected;
- how it was tested;
- what remains intentionally out of scope.

Prefer small, reviewable changes. Avoid combining visual redesigns, runtime behavior, and unrelated refactors unless they are required for one coherent release.

## Product language

Be precise. Hallow should not claim that an asset is safe, a model is correct, a sandbox is absolute, an RWA grants legal rights, or autonomous recovery can never fail. Describe evidence, policy, limits, and unknowns directly.

## Security reports

Do not open public issues for suspected vulnerabilities involving secrets, access control, sandbox escape, signature verification, approval bypass, or wallet safety. Follow [SECURITY.md](./SECURITY.md).
