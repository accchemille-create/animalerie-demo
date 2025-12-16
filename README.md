# ACC Animalerie Chemillé Centre

Application web complète pour la gestion d'une animalerie avec :
- Comptes utilisateurs et profils personnalisés
- Fiches conseils & bien-être (catégorisées)
- Annuaire de partenaires locaux
- Agenda d'événements
- Galerie photos et gestion d'animaux
- **Synchronisation Supabase** pour partage multi-utilisateurs

## 🚀 Déploiement

**Site en ligne :** https://accchemille-create.github.io/animalerie-demo/

## 📋 Fonctionnalités

### Pour tous les utilisateurs
- **Inscription/Connexion** : créez un compte avec email et mot de passe
- **Profil personnalisé** : ajoutez vos animaux (nom, type, âge), photo de profil et galerie (max 20 photos, compression automatique)
- **Consultation** : parcourez les conseils, partenaires et événements

### Pour les administrateurs
- **Connexion admin** : depuis la page "Conseils", cliquez sur "Connexion administratrice" (mot de passe : `admin123` par défaut)
- **Gestion de contenu** : ajoutez, éditez, supprimez conseils/partenaires/événements
- **Gestion des admins** : promouvez ou démouvoir d'autres utilisateurs
- **Synchronisation automatique** : toutes les modifications sont automatiquement poussées vers Supabase

### Synchronisation Supabase
- **Automatique** : chaque modification est synchronisée avec Supabase (debounce 800ms)
- **Bouton manuel** : utilisez le bouton "⇄ Synchroniser" pour forcer une synchronisation complète
- **Partage multi-appareils** : les modifications d'un admin sont visibles par tous après synchronisation

## 👤 Comptes par défaut

**Compte administrateur :**
- Email : `admin@local`
- Mot de passe : `admin123`

**Session administratrice (pour modifier le contenu) :**
- Depuis la page "Conseils" → "Connexion administratrice"
- Mot de passe : `admin123`

## 🔧 Installation locale

```powershell
# Cloner le repo
git clone https://github.com/accchemille-create/animalerie-demo.git
cd animalerie-demo

# Lancer un serveur local
python -m http.server 8000

# Ouvrir dans le navigateur
# http://127.0.0.1:8000
```

## 🗄️ Architecture

- **Frontend** : HTML, CSS, JavaScript vanilla (aucune dépendance npm)
- **Base de données** : Supabase (PostgreSQL)
- **CDN** : Supabase JS client via jsDelivr
- **Stockage local** : localStorage (fallback et cache local)
- **Sécurité** : PBKDF2 (SHA-256) pour les mots de passe admin

## 📦 Fichiers

```
Application/
├── index.html       # Structure et UI
├── styles.css       # Styles CSS
├── app.js          # Logique applicative + Supabase
├── README.md       # Documentation
└── .gitignore      # Exclusions Git
```

## 🔐 Sécurité

- **Mots de passe admin** : stockés avec PBKDF2 (100 000 itérations) + sel aléatoire
- **Row Level Security** : activée sur Supabase (policies configurables)
- **Compression d'images** : limite de 10 MB total pour la galerie
- **Validation côté client** : tous les formulaires sont validés

## 📝 Notes techniques

### Supabase
- Table `app_state` : stocke users, advice, partners, events en JSONB
- URL : `https://dsyxwboxqktwtfxigdro.supabase.co`
- Auth : clé publique `anon` (exposée côté client)

### Synchronisation
- **Push auto** : déclenché après chaque modification (debounce 800ms)
- **Pull au chargement** : récupère l'état Supabase au démarrage
- **Bouton sync** : push local → Supabase puis pull Supabase → local

### Limitations actuelles
- Pas d'authentification Supabase (auth simple localStorage)
- Photos stockées en base64 (limite de 10 MB recommandée)
- Pas de résolution de conflits (last-write-wins)

## 🛠️ Développement futur

Améliorations possibles :
- Migration vers Supabase Auth pour sécurité renforcée
- Upload photos vers Supabase Storage (au lieu de base64)
- Résolution de conflits (versioning, CRDTs)
- Notifications push pour nouveaux événements
- Mode hors ligne avec sync différée
- Interface d'administration enrichie

## 📄 Licence

Projet personnel - usage libre pour démonstration.