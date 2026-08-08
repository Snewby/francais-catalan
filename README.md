# francais-catalan

A single-user Catalan grammar trainer for French speakers. Vanilla TypeScript
and Vite, deployed as a static site to GitHub Pages. Questions are decomposed
against a closed taxonomy of grammatical components, and each component carries
a French gloss plus an explicit statement of how it relates to French.

## Status

Phase 0 complete: toolchain, agentic scaffolding and an empty app shell. The
taxonomy, the closed-vocabulary machinery and the API client land in phases 1
to 4.

## Setup

```bash
npm install
```

```bash
npm run dev
```

The Anthropic API key is entered at runtime and kept in this browser's
localStorage. It is never hardcoded, committed, or read from a file.

## Scripts

| Script                  | Does                                                    |
| ----------------------- | ------------------------------------------------------- |
| `npm run dev`           | Vite dev server                                         |
| `npm run build`         | Typecheck, then production build into `dist/`           |
| `npm run preview`       | Serve the production build locally                      |
| `npm test`              | vitest in watch mode                                    |
| `npm run test:run`      | vitest once                                             |
| `npm run lint`          | ESLint                                                  |
| `npm run format`        | Prettier, write                                         |
| `npm run typecheck`     | `tsc --noEmit`                                          |
| `npm run gen-schema`    | Rebuild the taxonomy and regenerate `src/api/schema.ts` |
| `npm run validate-ids`  | Assert every referenced component ID exists             |
| `npm run check-glosses` | Assert every leaf has `glosses.fr` and a `contrast_fr`  |

## Two languages, deliberately different

The **application** is French: all UI copy, all model-generated explanation, all
glosses. The **repository** is British English: code, identifiers, comments,
docs, commit messages. Catalan surface forms stay Catalan and are never
translated. See `.claude/rules/` for the enforced version of both.

## Deployment

Pushing to `main` builds and deploys to GitHub Pages. Two things are worth
knowing:

- `base` in `vite.config.ts` is `/francais-catalan/` and must match the
  repository name, or every asset URL 404s.
- **Manual one-time step:** set Settings, Pages, Source to "GitHub Actions". No
  agent can do this for you, and the deploy silently does nothing until it is
  done.

## Agentic scaffolding

`.claude/` holds the project's Claude Code configuration: two skills
(`catalan-taxonomy`, `fr-metalanguage`), four subagents, four commands, two
path-scoped rules files, and hooks that enforce the invariants CLAUDE.md can
only advise on. The hook scripts live in `scripts/hooks/`.
