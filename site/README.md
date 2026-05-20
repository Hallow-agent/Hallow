# Hallow Agent Site

Static domain site for `hallow-agent.xyz`.

Deploy this directory as the Vercel project root:

```bash
cd site
vercel --prod
```

Public install surface:

```bash
curl -fsSL https://hallow-agent.xyz/install.sh | bash
```

```powershell
irm https://hallow-agent.xyz/install.ps1 | iex
```

Configure after install:

```bash
hallow terminal
hallow setup
hallow start
```

Docs surface:

```text
/docs
```

The bootstrap scripts fetch the canonical installer from the GitHub repo and keep `/install.sh` plus `/install.ps1` stable for the public domain.
