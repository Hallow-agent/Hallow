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

```cmd
powershell -ExecutionPolicy Bypass -NoProfile -Command "irm https://hallow-agent.xyz/install.ps1 | iex"
```

Configure after install:

```bash
hallow version
hallow start
```

Docs surface:

```text
/docs
```

The install scripts are self-contained at `/install.sh`, `/install.ps1`, and `/install.cmd`.
