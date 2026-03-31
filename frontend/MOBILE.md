# Application mobile (Android / iOS) avec Capacitor

L’application web est prête à être exécutée en natif via **Capacitor**.

## Prérequis

- **Android** : [Android Studio](https://developer.android.com/studio) + SDK Android
- **iOS** : Mac avec [Xcode](https://developer.apple.com/xcode/) (uniquement sur macOS)

## Configuration de l’API en mobile

Sur appareil ou simulateur, l’app ne peut pas utiliser `localhost`. Configurez l’URL de votre backend :

1. Créez un fichier `.env` à la racine de `frontend/` (voir `.env.example`).
2. Définissez l’URL publique de votre API, par exemple :
   ```env
   VITE_API_URL=https://votre-serveur.com
   ```
3. Reconstruisez et resynchronisez :
   ```bash
   npm run cap:sync
   ```

## Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm run build` | Build de l’app web (sortie dans `dist/`) |
| `npm run cap:sync` | Build + copie du build dans les projets Android/iOS |
| `npm run cap:android` | Ouvre le projet Android dans Android Studio |
| `npm run cap:ios` | Ouvre le projet iOS dans Xcode (Mac uniquement) |
| `npm run cap:run:android` | Sync + lance l’app sur un appareil/émulateur Android |
| `npm run cap:run:ios` | Sync + lance l’app sur simulateur/appareil iOS (Mac) |

## Workflow type

1. Développer et tester en web : `npm run dev`
2. Build : `npm run build`
3. Synchroniser vers les projets natifs : `npx cap sync` (ou `npm run cap:sync`)
4. Ouvrir Android Studio ou Xcode et lancer l’app sur un appareil ou un simulateur

Après chaque modification du code web, refaire un `npm run cap:sync` (ou `cap:run:android` / `cap:run:ios`) pour que les changements soient pris en compte dans l’app native.

## Identité de l’app

- **App ID** (package) : `com.gestionplanning.app` (modifiable dans `capacitor.config.json`)
- **Nom affiché** : « Gestion Planning »

Pour publier sur les stores (Google Play, App Store), il faudra configurer les signatures, certificats et métadonnées dans Android Studio et Xcode.
