# Example Hallow Home

Use this folder as a disposable local runtime home:

```bash
$env:HALLOW_HOME="examples/hallow-home/.hallow"
corepack pnpm hallow init
corepack pnpm hallow doctor
```

Generated local runtime files are ignored by Git when they live inside `.hallow/`.

