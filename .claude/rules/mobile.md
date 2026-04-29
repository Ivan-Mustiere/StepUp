# Règles — Mobile React Native / Expo

## Stack

- React Native 0.74, Expo 51
- Point d'entrée : `App.js`
- Client HTTP : `src/api/api.js` (AsyncStorage pour tokens)

## Conventions

- Même logique métier que le frontend web, adapté aux APIs natives
- `AsyncStorage` à la place de `localStorage` — import depuis `@react-native-async-storage/async-storage`
- Composants en PascalCase, StyleSheet inline ou fichier séparé `styles.js`
- Navigation : React Navigation (à configurer dans `src/navigation/AppNavigator.js`)

## API

- `src/api/api.js` doit rester synchronisé en logique avec `frontend/src/api/api.js`
- Les deux ne peuvent pas être mutualisés (localStorage vs AsyncStorage) — documenter les divergences
- Même gestion du refresh token que le web

## Composants à implémenter (stubs vides)

Priorité d'implémentation :
1. `src/components/Button.js` — bouton natif avec TouchableOpacity
2. `src/components/Card.js` — carte native
3. `src/navigation/AppNavigator.js` — Stack + Tab navigators
4. `src/screens/HomeScreen.js` — tableau de bord post-login
5. `src/screens/DetailScreen.js` — détail d'un pronostic

## Lancement

```bash
cd mobile
npx expo start        # QR code pour Expo Go
npx expo start --web  # version web (dev only)
```

## Contraintes

- Expo managed workflow — pas d'éjection sans raison valable
- `mobile/.expo/` gitignored
- Tester sur Android ET iOS (Expo Go) avant de valider un composant
