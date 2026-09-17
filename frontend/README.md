# Healthy Eats — frontend

React + Vite, plain JavaScript. See the root `README.md` and `CLAUDE.md` for the full
project — this file only covers what's specific to this package.

```bash
npm run dev      # Vite dev server on :5173, proxies /api and /socket.io to :4000
npm run build    # production build
npm run lint     # oxlint
```

`@shared/*` resolves to `./src/shared` (see `vite.config.js`'s `resolve.alias`) — a copy
kept identical to `backend/src/shared/index.js`;
`jsconfig.json` mirrors the same paths for editor autocomplete.

## Environment variables

Both are optional and empty by default, which keeps the current same-origin behaviour
(the Vite dev proxy above). Set them when the frontend and backend are deployed to
separate domains — see `.env.example`.
