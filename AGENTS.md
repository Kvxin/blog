## Development

This is a pnpm workspace. The Astro app is in `apps/web`, the Ant Design
administration app is in `apps/admin`, and the NestJS API is in `apps/api`.
Run workspace scripts from the repository root. The public Nginx server uses
port 4321; use port 4322 for local Astro development (`pnpm dev:web`).

The global API AuthGuard protects every business route by default. Mark only
intentional public routes with @Public; never bypass session, Origin or CSRF
validation when adding write endpoints. CMS publishing builds Astro from a private
public-content snapshot; standalone/GitHub Pages builds still read local files.
Never pass API secrets to build subprocesses or execute CMS content as MDX.

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
