# Règles — Frontend React

## Stack

- React 18, Vite 5
- Point d'entrée : `src/main.jsx` → `src/App.jsx`
- Client HTTP : `src/api/api.js` (localStorage pour tokens)

## Conventions

- Composants en PascalCase, fichiers en PascalCase (`Button.jsx`, pas `button.jsx`)
- Hooks custom dans `src/hooks/` (à créer si besoin)
- Pas de prop-drilling profond — utiliser Context si l'état doit être partagé
- `localStorage` pour `access_token` et `refresh_token` — clés identiques à `api.js`

## API

- Toutes les requêtes HTTP via `src/api/api.js` — jamais de `fetch`/`axios` direct dans les composants
- Intercepter les 401 pour tenter un refresh automatique avant de déconnecter
- Gérer les erreurs réseau gracieusement (message utilisateur, pas de crash)

## Composants à implémenter (stubs vides)

Priorité d'implémentation :
1. `components/Button.js` — bouton réutilisable avec variants
2. `components/Card.js` — carte générique
3. `navigation/AppNavigator.js` — routing React Router v6
4. `screens/HomeScreen.js` — tableau de bord post-login
5. `screens/DetailScreen.js` — détail d'un pronostic

## Build

- `npm run dev` → http://localhost:5173
- `npm run build` → `dist/` (gitignored)
- Pas de variables d'environnement sensibles dans le bundle Vite
