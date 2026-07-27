# Hallow Agent Site

Static domain site for `hallow-agent.xyz`.

Deploy this directory as the Vercel project root:

```bash
cd site
vercel --prod
```

Public install surface:

```powershell
iex (irm https://hallow-agent.xyz/install.ps1)
```

```bash
curl -fsSL https://hallow-agent.xyz/install.sh | bash
```

Configure after install:

```bash
hallow
hallow start
```

Docs surface:

```text
/docs
```

The install scripts are self-contained at `/install.sh`, `/install.ps1`, and `/install.cmd`.
