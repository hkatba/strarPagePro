# Local Docker Source Development Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make English the default locale and run checked-out source through Docker Compose with external host data.

**Architecture:** Next-intl routing remains static and changes its default to `en`. Compose builds the root Dockerfile into `navidash:local`, mounts `NAVIDASH_DATA_DIR` at `/app/data`, and is supported by LF and Docker-context rules.

**Tech Stack:** Next.js 14, next-intl 4, Jest, Docker Compose v2, Alpine shell.

## Global Constraints

- Keep only `en` and `zh` route locales; the default must be `en`.
- Build Compose image `navidash:local` from `.`.
- Mount `${NAVIDASH_DATA_DIR:-/opt/navidash-data}` at `/app/data`.
- Enforce LF for shell scripts and exclude `.env` and `.env.*`, retaining `.env.example`.
- Do not recreate publishing CI.

---

### Task 1: Change and test the locale default

**Files:**
- Create: `src/__tests__/navigation.test.ts`
- Modify: `src/navigation.ts`
- Modify: `.env.example`

**Interfaces:** Consumes exported `routing`; produces `routing.defaultLocale === 'en'`.

- [ ] **Step 1: Write the failing test**

```ts
import {routing} from '@/navigation';

describe('navigation routing', () => {
  it('uses English when a request has no locale prefix', () => {
    expect(routing.defaultLocale).toBe('en');
    expect(routing.locales).toEqual(['en', 'zh']);
  });
});
```

- [ ] **Step 2: Verify failure**

Run `npm test -- navigation.test.ts --runInBand`; expect failure because the current default is `zh`.

- [ ] **Step 3: Implement the minimal change**

Set `defaultLocale: 'en'` in `src/navigation.ts` and set the unused `.env.example` guidance variable `NEXT_PUBLIC_DEFAULT_LOCALE=en`. Do not add environment-driven routing logic.

- [ ] **Step 4: Verify pass**

Run `npm test -- navigation.test.ts --runInBand`; expect pass.

- [ ] **Step 5: Commit**

Run `git add src/navigation.ts src/__tests__/navigation.test.ts .env.example` and `git commit -m "feat: default navigation locale to English"`.

### Task 2: Enable and test local Docker source builds

**Files:**
- Create: `.gitattributes`
- Create: `src/__tests__/dockerConfig.test.ts`
- Modify: `docker-compose.yml`
- Modify: `docker-entrypoint.sh`
- Modify: `.dockerignore`

**Interfaces:** Consumes the root Dockerfile and `NAVIDASH_DATA_DIR`; produces a local image build and external `/app/data` mount.

- [ ] **Step 1: Write the failing static test**

```ts
import fs from 'fs';
import path from 'path';

const read = (name: string) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

describe('local Docker configuration', () => {
  it('builds the local image and keeps the external data mount', () => {
    const compose = read('docker-compose.yml');
    expect(compose).toContain('build: .');
    expect(compose).toContain('image: navidash:local');
    expect(compose).toContain('${NAVIDASH_DATA_DIR:-/opt/navidash-data}:/app/data');
  });

  it('uses an LF Alpine entrypoint and excludes local env files', () => {
    expect(read('docker-entrypoint.sh')).toMatch(/^#!\/bin\/sh\n/);
    expect(read('docker-entrypoint.sh')).not.toContain('\r\n');
    expect(read('.gitattributes')).toContain('*.sh text eol=lf');
    expect(read('.dockerignore')).toContain('.env.*');
    expect(read('.dockerignore')).toContain('!.env.example');
  });
});
```

- [ ] **Step 2: Verify failure**

Run `npm test -- dockerConfig.test.ts --runInBand`; expect failure because no local build config, LF policy, or environment-file exclusions exist.

- [ ] **Step 3: Implement the Docker contract**

Remove Compose `version`, add `build: .`, set `image: navidash:local`, and retain all existing environment values plus the existing external volume expression. Add `.gitattributes` containing `*.sh text eol=lf`; convert only `docker-entrypoint.sh` to LF; add `.env`, `.env.*`, and `!.env.example` to `.dockerignore`.

- [ ] **Step 4: Verify static and Compose contracts**

Run `npm test -- dockerConfig.test.ts --runInBand` and `docker compose config`; expect both to pass, no obsolete-version warning, and a local build context `.`.

- [ ] **Step 5: Commit**

Run `git add docker-compose.yml docker-entrypoint.sh .dockerignore .gitattributes src/__tests__/dockerConfig.test.ts` and `git commit -m "fix: build local Docker source image"`.

### Task 3: Update local deployment documentation and changelog

**Files:**
- Modify: `docs/DEPLOY.md`
- Modify: `changelog.md`

**Interfaces:** Consumes the Compose contract from Task 2; produces correct local-source setup instructions.

- [ ] **Step 1: Document local startup**

Replace the Compose `pull` step with `docker compose build --no-cache` followed by `docker compose up -d`. State Linux default `/opt/navidash-data` and provide Windows `.env` example `NAVIDASH_DATA_DIR=C:/Users/your-name/navidash-data`; the directory must be writable and external to the repository.

- [ ] **Step 2: Correct upgrade and image wording**

Replace Compose `pull` with `docker compose build` during local upgrades; remove the claim that Compose defaults to GHCR. Keep a published-image `docker run` command only if explicitly described as optional.

- [ ] **Step 3: Add changelog entry**

Add a `2026-08-15` entry using the project template for the local-source image, external mount, LF entrypoint, protected build context, and English default.

- [ ] **Step 4: Validate**

Run `docker compose config`; expect local build output, `navidash:local`, external mount target `/app/data`, and no obsolete-version warning.

- [ ] **Step 5: Commit**

Run `git add docs/DEPLOY.md changelog.md` and `git commit -m "docs: document local Docker source deployment"`.

### Task 4: Complete verification

**Files:** Verify all Task 1-3 files.

**Interfaces:** Consumes all implemented changes; produces test and local-build evidence.

- [ ] **Step 1: Run focused checks**

Run `npm test -- navigation.test.ts dockerConfig.test.ts --runInBand`; expect pass.

- [ ] **Step 2: Run repository checks**

After `npm ci`, run `npm test -- --runInBand`, `npm run lint`, and `npm run build`; expect pass.

- [ ] **Step 3: Build and start local source**

With Docker Desktop running and an external writable `NAVIDASH_DATA_DIR`, run `docker compose build --no-cache`, `docker compose up -d`, `docker compose ps`, and `docker compose logs --tail=100 navidash`; expect a running local image and no `/bin/sh\r` error.

- [ ] **Step 4: Confirm Git state**

Run `git status --short`. This workspace currently lacks `.git`, so report that commits cannot be created unless Git metadata is restored.
