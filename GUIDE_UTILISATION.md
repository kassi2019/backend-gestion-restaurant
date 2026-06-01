# RestoPro — Guide d'Utilisation

## Table des matières

1. [Démarrage](#1-démarrage)
2. [Connexion](#2-connexion)
3. [Dashboard par Rôle](#3-dashboard-par-rôle)
4. [Commandes](#4-commandes)
5. [Cuisine & Bar](#5-cuisine--bar)
6. [Caisse & Paiement](#6-caisse--paiement)
7. [Menu & Variantes](#7-menu--variantes)
8. [Gestion de Stock](#8-gestion-de-stock)
9. [Tables & QR Codes](#9-tables--qr-codes)
10. [Affectation des Tables](#10-affectation-des-tables)
11. [Planning](#11-planning)
12. [Utilisateurs & Modules](#12-utilisateurs--modules)
13. [Abonnement](#13-abonnement)
14. [Super Admin](#14-super-admin)
15. [Client QR Code](#15-client-qr-code)
16. [Application Web](#16-application-web)
17. [Dépannage](#17-dépannage)

---

## 1. Démarrage

### Installation

```bash
cd gestion-restaurant-api
npm install
```

### Configuration (.env)

```env
DATABASE_URL="mysql://root:P@ssw0rd@localhost:3306/gestion_restaurant"
JWT_SECRET="votre-secret-jwt"
CODE_SECRET="votre-cle-aes"
SUPER_ADMIN_IDS=10
PORT=3000
ADRESSE_IP=0.0.0.0    # 0.0.0.0 = automatique, ou mettre l'IP
```

### Base de données

```bash
npx prisma db push
npm run seed
```

### Lancement

```bash
# API
npm run start:dev

# Web
cd ../gestion-restaurant-web
npm run dev

# Mobile
cd ../gestion-resto-mobile
npx expo start
```

### Comptes de test

| Rôle | Téléphone | Mot de passe |
|---|---|---|
| Super Admin | 0999999999 | 123456 |
| Admin | 0990000000 | 123456 |
| Serveur | 0990000001 | 123456 |
| Cuisine | 0990000002 | 123456 |
| Bar | 0990000003 | 123456 |
| **Code activation** | RESTO-TEST-CODE | 30 jours |

---

## 2. Connexion

### Mobile / Web

1. Saisir **téléphone** + **mot de passe**
2. Si abonnement expiré → bouton **Activer** + entrer un code

### Conditions
- Compte **ACTIF**
- **Planning du jour** (sauf ADMIN/MANAGER)
- **Abonnement** non expiré (sauf SUPER_ADMIN)

### Erreurs possibles
- *"Téléphone ou mot de passe incorrect"* → Vérifier les identifiants
- *"Votre compte est inactif"* → Contacter l'admin
- *"Aucun service programmé aujourd'hui"* → Pas de planning
- *"Abonnement expiré"* → Entrer un code d'activation
- *"Le restaurant est fermé"* → Clôture globale en cours

---

## 3. Dashboard par Rôle

Le dashboard s'adapte **automatiquement** au rôle connecté.

### ADMIN / MANAGER
- 4 cartes stats cliquables (Commandes, Tables, Revenus, En attente)
- Accès rapide ⭐ Abonnement / 🔒 Clôture Globale
- Dernières commandes avec statuts

### SERVEUR
- Tables assignées (compteur + liste)
- Commandes en cours / Servies aujourd'hui
- Planning du jour

### CUISINE
- Cards : À préparer, En cours, Prêtes
- File FIFO avec temps d'attente par table
- Actions : En préparation, ✅ Prêt, Tout prêt

### BAR
- Identique CUISINE mais pour les boissons uniquement

### CAISSIER
- Caisse du jour (total + détails par mode)
- À payer, Factures, Recherche CMD
- Clôture caissier + Historique

### SUPER ADMIN
- Stats abonnements (Total restos, En règle, En essai, Expirés)
- Codes d'activation (+ Générer)
- Liste restaurants avec abonnement (cliquable → historique)

---

## 4. Commandes

### Créer une commande (Web)

1. Page **Commandes** → **+ Nouvelle**
2. Sélectionner la table + type (sur place / à emporter)
3. Parcourir les catégories → cliquer sur un plat pour l'ajouter
4. Ajuster les quantités dans le panier
5. **✅ Créer la commande**

### Statuts et workflow

| Statut | Action | Qui |
|---|---|---|
| EN_ATTENTE | ✓ Valider | SERVEUR |
| VALIDEE | 👨‍🍳 En préparation | CUISINE/BAR |
| EN_PREPARATION | ✅ Prêt (par article) | CUISINE/BAR |
| PRETE | 🍽 Servie | SERVEUR |
| SERVIE | 💰 Payer | CAISSIER |
| PAYEE | — | — |

### Commandes Comptoir (T00)
- Auto-validées, pas de serveur
- Numéro CMD-XXXX généré
- Notifiées directement en cuisine/bar

---

## 5. Cuisine & Bar

### Dashboard Cuisine/Bar
Affiché automatiquement selon le rôle. Fonctionnement identique, filtrage par destination (CUISINE ou BAR).

### Actions
- Déplier une table → voir les articles
- **👨‍🍳 En préparation** → change le statut de la commande
- **✅ Prêt** par article → marque un article comme prêt
- **✅ Tout prêt** → tous les articles de la table prêts

---

## 6. Caisse & Paiement

### Encaisser

1. Onglet 💰 Paiements → sélectionner une commande
2. Choisir le mode : 💵 Espèces / 📱 Mobile Money / 💳 Carte
3. **✅ Payer** → le reçu s'ouvre en nouvel onglet

### Recherche par N° commande
Champ 🔍 en haut → taper le numéro CMD-XXXX

### Clôture Caissier (fin de shift)
- **🔒 Clôturer** → enregistre le bilan
- Le caissier ne voit que SES transactions depuis sa dernière clôture

### Clôture Globale (ADMIN)
- Onglet 📋 Clôtures → historique complet
- Depuis ⭐ Abonnement → 🔒 Clôture Globale
- Définir date/heure de réouverture → ferme tout le restaurant

### Réimpression reçu
Onglet 🧾 Factures → bouton 🖨️

---

## 7. Menu & Variantes

### CRUD Menu
Page 🍽️ Menu (Admin/Manager) :
- **+ Plat** : nom, prix, catégorie, temps, image
- **✏️ Modifier** / **🗑 Supprimer** sur chaque plat
- **✅ Disponible / ❌ Pas disponible** : contrôle visibilité demain

### Variantes
Pour les plats avec options (ex: Avec/Sans alcool) :
- Clic sur **📋 Variantes** → modal
- Ajouter : nom + prix + image
- Supprimer les variantes existantes
- Affichage dans le QR code client

### Import CSV
- Bouton **📥 Importer CSV** (web et mobile)
- Format : `nom,prix,categorieId,tempsPreparation,variantes`
- Variantes : `"Avec alcool:4000|Sans alcool:3500"`
- **📄 Modèle** téléchargeable

---

## 8. Gestion de Stock

### Principe
| Valeur | Signification |
|---|---|
| **-1** | Illimité |
| **> 0** | Stock disponible |
| **0** | Épuisé → grisé auto |

### Fonctionnement
1. Admin définit le stock initial (ex: Poulet DG → 20)
2. Chaque validation de commande → décrémente automatiquement
3. Stock = 0 → menu grisé automatiquement
4. Réapprovisionnement → dégrisé automatiquement

### Accès
- **Mobile** : Accueil → 📦 Stock
- Filtrage par catégorie
- Modifier le stock ou passer en illimité (∞)

---

## 9. Tables & QR Codes

### Gestion des tables
- Grille visuelle avec statuts colorés
- Filtres par zone et statut
- ✏️ Modifier / 🗑 Supprimer
- **Zone Comptoir** → commandes auto-validées

### QR Codes
- Générés dynamiquement : `/qr-table-{id}.png`
- S'adaptent à l'URL d'accès (`ADRESSE_IP=0.0.0.0` = automatique)
- Imprimer et placer sur les tables

---

## 10. Affectation des Tables

### Web / Mobile
Page 🔄 Affectation (Admin/Manager) :
- Sélectionner un serveur → cocher les tables → **Assigner**
- **✕ Désassigner** : bouton rouge à côté du serveur
- **🔀 Transférer** : toutes les tables d'un serveur → un autre
- **🤖 Vérification journalière** : redistribue automatiquement

---

## 11. Planning

### Visualisation
- Planning du jour par défaut
- Filtres : date, statut, employé
- Visible par **tous les rôles** (lecture seule pour non-admin)

### Gestion (Admin/Manager)
- **+ Ajouter** : employé, date, horaires, statut
- ✏️ Modifier / 🗑 Supprimer
- Stats du jour : actifs, absents, congés

---

## 12. Utilisateurs & Modules

### Création
1. Page 👥 Users → **+** (Admin/Manager)
2. Nom, téléphone, mot de passe, rôle
3. **🧩 Modules** : cocher les modules à assigner
4. Photo uploadable

### Modules dynamiques
Chaque utilisateur voit **uniquement** les modules qui lui sont assignés :
- Assignation à la création ou modification
- Bouton 🧩 Modules dans l'ActionSheet
- Module "Générer codes" invisible (SUPER_ADMIN uniquement)
- Navigation web/mobile automatique

### Actions
- ✏️ Modifier / 🗑 Supprimer
- 🔒/🔓 Activer/Désactiver

---

## 13. Abonnement

### Fonctionnement
- **Trial 14j** automatique à la création du restaurant
- **MENSUEL** (30j) ou **ANNUEL** (365j)
- Codes d'activation chiffrés AES

### Activation
1. Aller dans ⭐ Abonnement (ADMIN)
2. Entrer le code reçu → **Activer**
3. L'abonnement est prolongé, l'historique est enregistré

### Notifications automatiques
- > 50% restant → toutes les 24h
- ≤ 50% restant → toutes les 3h
- Tous les utilisateurs du resto sont notifiés

---

## 14. Super Admin

### Accès
- Login avec le compte SUPER_ADMIN
- Protégé par `SUPER_ADMIN_IDS` dans `.env` (seuls les IDs listés passent)

### Dashboard
- Stats : Total restos, En règle, En essai, Expirés
- Codes : Disponibles, Utilisés, Total
- Restaurants avec abonnement

### Génération de codes
- Page 🔑 Générer codes
- Durées : 30j, 1 an, 2 ans, 3 ans, 4 ans, 5 ans + personnalisé
- Codes chiffrés AES en base
- 👁️ Afficher/Masquer + 🗑 Supprimer
- Tabs : Disponibles / Utilisés

---

## 15. Client QR Code

### Commande
1. Scanner le QR code → page menu
2. Parcourir → cliquer **+** pour ajouter
3. Variantes : choisir l'option → **+**
4. Plats indisponibles : grisés, non commandables
5. Panier → ajuster quantités → **Commander**
6. Confirmation avec numéro de suivi

### À emporter (T00)
- Scanner le QR comptoir → commander
- **CMD-XXXX** affiché → donner à la caisse

---

## 16. Application Web

Disponible sur `http://localhost:5173` (dev) ou via le build.

### Fonctionnalités
- 🏠 Dashboard par rôle
- 🪑 Tables (grille + gestion)
- 📋 Commandes (création + suivi)
- 🍽️ Menu (CRUD + variantes + images + CSV)
- 📅 Planning (vue journalière)
- 💰 Caisse (paiement + factures + clôtures)
- 👥 Users (création + modules)
- 📊 Stats (dashboard, ventes, plats, serveurs)
- 🔔 Notifications (temps réel + badge)
- ⭐ Abonnement (activation + clôture globale)
- 📦 Stock (gestion par catégorie)
- 🔄 Affectation (tables → serveurs)

### Temps réel
- Socket.IO : commandes, statuts, notifications
- Badge compteur sur la sidebar
- Sonnerie audio

### Mode hors-ligne
- Bandeau rouge si connexion perdue
- Commandes sauvegardées en local
- Synchronisation automatique au retour

---

## 17. Dépannage

### Le QR code ne s'ouvre pas
- Vérifier `ADRESSE_IP` dans `.env`
- `0.0.0.0` = détection automatique (recommandé)
- Redémarrer le serveur après modification

### Le dashboard cuisine/bar est vide
- Vérifier que des commandes validées existent
- Le serveur doit d'abord **valider** la commande

### La caisse affiche 0.00 €
- Normal si nouveau caissier ou après clôture
- Vérifier que des paiements ont été effectués

### Impossible de se connecter
- Vérifier le statut (ACTIF)
- Vérifier le planning du jour (sauf Admin/Manager)
- Vérifier l'abonnement (pas expiré)
- Vérifier que le resto n'est pas fermé (clôture globale)

### Token expiré / déconnecté
- Le JWT expire après 12h → se reconnecter

### Droits d'accès (403 Forbidden)
- Vérifier que le rôle a bien le module assigné
- SUPER_ADMIN : vérifier `SUPER_ADMIN_IDS` dans `.env`

### Erreur "Rendered fewer hooks" (mobile)
- Redémarrer l'app
- Bug connu corrigé dans la dernière version

---

*Guide d'Utilisation — RestoPro v4.0 — Juin 2026*
