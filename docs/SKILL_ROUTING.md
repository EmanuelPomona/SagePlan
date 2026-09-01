# Skill Routing Matrix

Which skill applies at which stage. Names are **scoped** because unscoped names
can collide — `code-review` exists as both `ecc:code-review` and
`code-review:code-review`, and `frontend-design` as both a skill and a plugin.

Installed is not the same as registered. If a Skill call fails with an unknown
name, check what this session actually has rather than assuming the name is wrong,
and say so in your handoff instead of silently skipping the stage.

---

## UNIVERSAL

| Situation | Skill |
|---|---|
| New ambiguous product | `superpowers:brainstorming` |
| Producing a plan | `superpowers:writing-plans` |
| Executing an established plan | `superpowers:executing-plans` |
| Any bug or unexplained behavior | `superpowers:systematic-debugging` |
| Logic with rules, math, parsing, or state | `superpowers:test-driven-development` |
| Before claiming completion | `superpowers:verification-before-completion` |
| Before handoff | `superpowers:requesting-code-review` |
| Responding to a verdict | `superpowers:receiving-code-review` |
| Worktrees | `superpowers:using-git-worktrees` |

## MANAGER

| Situation | Skill |
|---|---|
| Product, user, value, MVP | `ecc:product-lens` |
| Shared interfaces | `ecc:contract-first` |
| Consequential cross-cutting decision | `ecc:architecture-decision-records` |

## FRONTEND DESIGN

Mandatory before major UI, in order:

1. `ecc:frontend-design-direction`
2. `frontend-design:frontend-design`
3. `ui-ux-pro-max:ui-ux-pro-max`
4. `design-taste-frontend`

| Situation | Skill |
|---|---|
| Existing redesign | `redesign-existing-projects` |
| Design system | `ecc:design-system` |
| React | `vercel:react-best-practices`, `ecc:react-patterns`, `ecc:react-performance` |
| Vite | `ecc:vite-patterns` |
| Next.js | `ecc:nextjs` |
| Accessibility | `ecc:frontend-a11y`, `ecc:accessibility` |
| Polish, after structure is right | `ecc:make-interfaces-feel-better` |
| Motion, when justified | `ecc:motion-foundations`, `ecc:motion-patterns`, `ecc:motion-ui` |
| Reference screenshot | `image-to-code` |
| Frontend verification | `ecc:browser-qa`, `ecc:e2e-testing` |

## BACKEND

| Situation | Skill |
|---|---|
| General architecture | `ecc:backend-patterns` |
| API design | `ecc:api-design` |
| Shared contract | `ecc:contract-first` |
| Failure behavior | `ecc:error-handling` |
| Auth, user input, uploads, secrets | `ecc:security-review` |
| Deeper scan | `ecc:security-scan` |

Framework skills only when that framework is actually present:
`ecc:fastapi-patterns`, `ecc:django-patterns`, `ecc:nestjs-patterns`,
`ecc:postgres-patterns`, `ecc:prisma-patterns`, `ecc:redis-patterns`,
`ecc:database-migrations`.

## REVIEWER

Mandatory for a substantial frontend review, all four:

1. `ecc:browser-qa`
2. `frontend-design:frontend-design`
3. `ui-ux-pro-max:ui-ux-pro-max`
4. `ecc:make-interfaces-feel-better`

When applicable: `ecc:e2e-testing`, `ecc:frontend-a11y`, `ecc:security-review`.
