# Local Docker Source Development Design

## Goal

Run the checked-out source locally through Docker Compose without pulling the published GHCR image, keep runtime data in an external host directory, and make English the application default language.

## Design

- The `navidash` Compose service builds from the repository root and tags the result as `navidash:local`.
- The service mounts `${NAVIDASH_DATA_DIR:-/opt/navidash-data}` at `/app/data`. Windows users set an absolute Docker Desktop-shared path such as `C:/Users/DeadShot/navidash-data` in `.env`.
- `docker-entrypoint.sh` uses LF line endings. `.gitattributes` enforces LF for shell files so the Alpine container can execute the shebang correctly.
- `.dockerignore` excludes `.env` and `.env.*` while explicitly retaining `.env.example`, preventing local secrets from entering the Docker build context.
- The obsolete Compose `version` field is removed. Deployment documentation explains local build behavior, the external data path, and the verification commands.
- The application routing default changes from `zh` to `en`. Locale-less requests therefore redirect or resolve to English; both `en` and `zh` remain supported.
- The currently unused `NEXT_PUBLIC_DEFAULT_LOCALE` examples are set to `en` to avoid conflicting operator guidance. No new environment-based locale behavior is introduced.
- `changelog.md` records the meaningful Docker/deployment behavior change.

## Verification

1. Start Docker Desktop.
2. Run `docker compose build --no-cache` and confirm the source is built locally.
3. Run `docker compose up -d` with `NAVIDASH_DATA_DIR` set to an external writable directory.
4. Confirm the container remains healthy, the app responds on port 3000, and files written under `/app/data` appear in the configured host directory.
5. Run the focused locale test and confirm a request without a locale uses English.

## Non-goals

- Publish images to GHCR or recreate the missing CI workflow.
- Change application runtime behavior beyond the local Docker delivery path.
