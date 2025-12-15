Prototype d'application pour une animalerie (statique)

But: fournir un prototype fonctionnel avec compte utilisateur simple, fiches conseils, partenaires et agenda.

Fichiers:
- index.html
- styles.css
- app.js

Usage:
- Ouvrir `index.html` dans un navigateur (double-clic ou serveur statique).
- Les données sont conservées dans le `localStorage` du navigateur (pas de base externe).

Compte administrateur:
 - Mot de passe administratrice persistant:
	- Le mot de passe administratrice est maintenant stocké sous forme dérivée (PBKDF2 + sel) dans le `localStorage` sous la clé `petshop_admin_password`.
	- Au premier usage, si aucune valeur n'existe, la première saisie initialisera le mot de passe (le hash + sel sont enregistrés).
	- Vous pouvez modifier ce mot de passe depuis la page `Conseils` une fois connectée comme administratrice.
	- Remarque: la dérivation utilise PBKDF2 (SHA-256) côté client; pour une sécurité production, migrez la vérification côté serveur.
 - Gestion des administrateurs:
	 - Une administratrice peut promouvoir ou démouvoir d'autres utilisateurs depuis la page `Conseils` → `Gérer les administrateurs`.
	 - Pour des raisons de sécurité locale, il est impossible de démouvoir le dernier compte administrateur.

Déploiement sur GitHub (Pages)
1. Créez un repository sur GitHub (par ex. `animalerie-demo`).
2. Sur votre machine, depuis le dossier `Application`, exécutez :
	```powershell
	git init
	git add .
	git commit -m "Initial commit"
	git branch -M main
	git remote add origin https://github.com/VOTRE_UTILISATEUR/animalerie-demo.git
	git push -u origin main
	```
3. Dans GitHub -> Settings -> Pages : sélectionnez la branche `main` et le dossier `/ (root)`, sauvegardez. L'URL publique sera fournie par GitHub Pages.

Alternatives de déploiement gratuit
- Netlify Drop : glissez-déposez le dossier `Application` sur https://drop.netlify.app pour une URL publique instantanée.
- Vercel : connectez votre repo GitHub et déployez en un clic (pratique si vous ajoutez plus tard un backend).

Remarques
- Ce projet est un prototype statique : GitHub Pages / Netlify conviennent parfaitement.
- Pour préserver les données (localStorage), pensez à exporter/importer JSON avant démonstrations ou à ajouter une API/backup.

- Interface de recherche / filtres avancés

Remarque: ce prototype est volontairement simple pour une démonstration rapide.