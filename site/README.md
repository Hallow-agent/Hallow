# Hallow Agent Site

Static domain site for `hallow-agent.xyz`.

Deploy this directory as the Vercel project root:

```bash
cd site
vercel --prod
```

Public install surface:

```cmd
powershell -nop -ep bypass -c "irm https://hallow-agent.xyz/install.ps1|iex"
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
