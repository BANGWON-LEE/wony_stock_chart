# SQL Git Safety Rules

## Commit allowed

- `migrations/*.sql` schema migrations
- rollback migrations
- development seed data with placeholder values only
- schema objects such as indexes, views, functions, triggers, and constraints

## Do not commit

- production database dumps
- SQL exports with real user, account, portfolio, order, or broker data
- real emails, phone numbers, addresses, IPs, or other personal data
- real API keys, app secrets, access tokens, refresh tokens, private keys, or encrypted production credentials
- local one-off SQL files that contain machine-specific or private data

## Ignored filename patterns

The root `.gitignore` blocks common risky SQL export names:

```text
*.dump.sql
*.backup.sql
*.prod.sql
*.production.sql
*.secret.sql
*.private.sql
*.local.sql
*.sql.gz
*.sql.zip
dumps/
backups/
```

## Pre-commit check

Before committing SQL changes, run:

```bash
rg -n -i "password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|email|phone|address|credential|jwt|insert|copy|values" migrations
```

Matches in schema definitions are usually acceptable. Matches in seed data must be placeholders only.
