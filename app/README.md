# IEF Admin — Plateforme de gestion administrative

Application Next.js de gestion administrative multi-bureaux pour l’IEF Grand Dakar.

## Prérequis

- Node.js 20 ou supérieur
- npm
- Un projet Supabase (optionnel en mode démo)

## Installation

```bash
npm install
```

## Configuration

Copier `.env.example` vers `.env.local`, puis renseigner les valeurs du projet Supabase :

```bash
cp .env.example .env.local
```

Variables nécessaires :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (réservée aux routes serveur)

Sans ces variables, l’application démarre en **mode démo** en développement. En production, une configuration Supabase manquante renvoie une erreur 503.

## Démarrage

```bash
npm run dev
```

L’application est disponible sur [http://localhost:3000](http://localhost:3000).

## Vérifications

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Structure principale

- `src/app` — pages et routes API (App Router)
- `src/components` — composants d’interface et modules métier
- `src/lib` — données, types, accès Supabase et contexte de rôle
- `supabase` — migrations et scripts SQL
- `public` — icônes, manifeste PWA et service worker
