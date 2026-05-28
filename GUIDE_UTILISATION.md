# RestoPro — Guide d'Utilisation

## Table des matières

1. [Démarrage](#1-démarrage)
2. [Connexion](#2-connexion)
3. [Dashboard](#3-dashboard)
4. [Commandes (Serveur)](#4-commandes-serveur)
5. [Cuisine](#5-cuisine)
6. [Bar](#6-bar)
7. [Caisse](#7-caisse)
8. [Menu](#8-menu)
9. [Tables et QR Codes](#9-tables-et-qr-codes)
10. [Planning](#10-planning)
11. [Utilisateurs](#11-utilisateurs)
12. [Statistiques](#12-statistiques)
13. [Profil et Paramètres](#13-profil-et-paramètres)
14. [Client (QR Code)](#14-client-qr-code)
15. [Dépannage](#15-dépannage)

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
PORT=3000
ADRESSE_IP=192.168.1.7    # ← Mettre l'IP réelle du serveur
```

### Base de données

```bash
npx prisma db push        # Créer les tables
npm run seed              # Données de test
```

### Lancement

```bash
# Backend
npm run start:dev

# Mobile (dans gestion-resto-mobile)
npx expo start
```

### Comptes de test (après seed)

| Rôle | Téléphone | Mot de passe |
|---|---|---|
| Admin | 0990000000 | 123456 |
| Serveur | 0990000001 | 123456 |
| Cuisine | 0990000002 | 123456 |
| Bar | 0990000003 | 123456 |

---

## 2. Connexion

1. Ouvrir l'app mobile
2. Saisir le **numéro de téléphone** et le **mot de passe**
3. Appuyer sur **Se connecter**

**Conditions de connexion :**
- Le compte doit être **ACTIF**
- Un **planning du jour** doit exister (sauf pour Admin et Manager)

**Erreurs possibles :**
- *"Téléphone ou mot de passe incorrect"* → Vérifier les identifiants
- *"Votre compte est inactif"* → Contacter l'administrateur
- *"Aucun service programmé aujourd'hui"* → Pas de planning pour aujourd'hui

---

## 3. Dashboard

Après connexion, le dashboard s'adapte automatiquement à votre rôle.

### Dashboard Admin/Manager
- **Commandes du jour** par statut (cliquables pour voir le détail)
- **Accès rapide** : Tables, Commandes, Menu, Planning, Utilisateurs, Caisse, Stats

### Dashboard Serveur
- **Commandes du jour** filtrées (uniquement ses tables)
- **Mes Tables** : voir les tables assignées
- **Notifications** : badge rouge si non lues

### Dashboard Cuisine
- **Stats** : À préparer / En cours / Prêtes
- **Files d'attente FIFO** : les plus anciennes en haut
- **⏱ Timer** : minutes d'attente par table
- **Code couleur** : 🔴 urgent (>15min) / 🟡 moyen / 🟢 normal
- **Actions** : "En préparation", "Prêt" par article, "Tout prêt" par table

### Dashboard Bar
- Identique à la Cuisine, mais uniquement pour les boissons
- Montants affichés : total bar uniquement

### Dashboard Caissier
- **Caisse du jour** : total et détail par mode de paiement
- **À payer** : commandes prêtes à être payées
- **Factures** : historique du jour
- **Recherche CMD** : taper un numéro de commande

---

## 4. Commandes (Serveur)

### Voir les commandes
Onglet **Commandes** → liste des commandes groupées par table.

### Valider une commande
1. Repérer une commande **En attente**
2. Cliquer sur la table pour déplier
3. Cliquer **✓ Valider** → la commande passe en **Validée**
4. La table passe automatiquement en **OCCUPEE**

### Servir une commande
1. Quand le statut est **Prête** (tous les articles prêts)
2. Cliquer **🍽 Servie**
3. Le client peut maintenant demander l'addition

### Actions disponibles selon le statut

| Statut | Bouton | Qui |
|---|---|---|
| En attente | ✓ Valider | Serveur |
| Validée | 👨‍🍳 En préparation | Cuisine/Bar |
| En préparation | ✅ Prêt (par article) | Cuisine/Bar |
| Prête | 🍽 Servie | Serveur |

---

## 5. Cuisine

### Écran principal
Le dashboard cuisine s'affiche automatiquement pour les cuisiniers.

### Préparer une commande
1. **Déplier la table** en cliquant dessus
2. Cliquer **👨‍🍳 En préparation** → la commande passe en préparation
3. Pour chaque article terminé → cliquer **✅ Prêt**

### Tout prêt d'un coup
- Cliquer **✅ Tout prêt** sur la table → tous les articles cuisine sont marqués prêts

### Statut automatique
Quand **tous** les articles (cuisine + bar) sont prêts → la commande passe automatiquement en **PRETE**. Le serveur est notifié.

---

## 6. Bar

Fonctionnement identique à la Cuisine, mais pour les boissons uniquement.

- Le barman ne voit que les articles **BAR**
- Les montants affichés sont le total des boissons
- Le "Tout prêt" marque toutes les boissons de la table comme prêtes

---

## 7. Caisse

### Encaisser un paiement

**Depuis le dashboard :**
1. Onglet **🧾 À payer** → liste des commandes à payer
2. Cliquer sur une commande
3. Choisir le mode : **Espèces**, **Mobile Money** ou **Carte Bancaire**
4. Le reçu s'affiche → possibilité d'imprimer 🖨

**Depuis la recherche :**
1. Taper le numéro `CMD-XXXX` donné par le client
2. Cliquer sur le résultat → paiement direct

### Clôturer sa caisse (fin de shift)
1. Dashboard Caissier → **Clôturer la caisse**
2. Confirmer → le bilan est enregistré
3. Le dashboard repart à **zéro** (prêt pour le remplaçant)

### Clôture Globale (Admin uniquement)
1. **Profil** → **Paramètres du restaurant**
2. Section **🔒 Clôture Globale**
3. Définir la date et heure de réouverture
4. Cliquer **Fermer le restaurant**
5. Plus aucune commande possible jusqu'à la réouverture

---

## 8. Menu

### Gérer le menu (Admin/Manager)
Onglet **Menu** :
- **+** : Créer un plat (nom, prix, catégorie, temps de préparation)
- Cliquer sur un plat → modifier ou supprimer
- **Activer/Désactiver** un plat

### Catégories
- Chaque catégorie a une **destination** : Cuisine, Bar, Dessert
- Cette destination détermine quel acteur reçoit la commande

---

## 9. Tables et QR Codes

### Créer une table
Onglet **Tables** → **+** :
- **Numéro** : ex: T05
- **Zone** : Terrasse, Intérieur, VIP, Comptoir

### Zone Comptoir
Les tables en zone **Comptoir** sont spéciales :
- Pas de serveur assigné
- Commandes auto-validées
- Numéro `CMD-XXXX` généré pour le client

### QR Codes
- Générés automatiquement à la création
- Accessibles sur `http://IP:3000/qrcodes.html`
- Imprimer et placer sur les tables

### Assigner un serveur
1. Sélectionner une table → **👤 Assigner**
2. Choisir le serveur

### Transfert (serveur absent)
1. Onglet **Transfert**
2. Serveur source → Serveur cible
3. Toutes les tables sont transférées

---

## 10. Planning

### Consulter
Onglet **Planning** → voir les plannings filtrés par date.

### Filtrer (Admin/Manager)
- **Rôle** : liste déroulante (Tous, Serveur, Cuisine, Bar, Caissier)
- **Agent** : liste déroulante des agents du rôle sélectionné

### Créer un planning (Admin/Manager)
1. Bouton **+**
2. Sélectionner le **rôle** puis l'**agent**
3. Choisir la **date** et les **heures** (début/fin)
4. **Créer**

### Supprimer
Cliquer sur un planning → **Supprimer**

---

## 11. Utilisateurs

### Créer (Admin/Manager)
Onglet **Users** → **+** :
- Nom, Téléphone, Mot de passe
- **Rôle** : liste déroulante (Admin, Manager, Serveur, Cuisine, Bar, Caissier)

### Modifier
Cliquer sur un utilisateur → Modifier

### Filtrer par rôle
Barre de filtre en haut → sélectionner un rôle

---

## 12. Statistiques

Onglet **Statistiques** (Admin/Manager uniquement).

### Filtre de date
- **Du** : date de début
- **Au** : date de fin
- Par défaut : aujourd'hui

### Sections
- **📋 Commandes** : total, CA, panier moyen (cliquable)
- **🪑 Tables** : occupation, moyenne (cliquable)
- **👤 Serveurs** : performance avec barres
- **💰 Caissiers** : performance avec barres
- **🏆 Top Plats** : classement par quantité
- **📈 Affluence** : graphique par heure

---

## 13. Profil et Paramètres

### Mon Profil
Avatar (haut gauche) → **Mon Profil** :
- Photo de profil
- Changement de mot de passe

### Paramètres Restaurant (Admin)
Profil → **🏪 Paramètres du restaurant** :
- Nom, adresse, téléphone, devise
- **🔒 Clôture Globale** : fermer le restaurant

---

## 14. Client (QR Code)

### Sur place
1. Scanner le QR code de la table → page web
2. Parcourir le menu, ajouter au panier
3. **Commander** → confirmation
4. Suivre le statut en temps réel (📋 Voir commande)

### À emporter (Comptoir)
1. Scanner le QR code du comptoir (T00)
2. Commander → **CMD-XXXX** affiché
3. Donner ce numéro à la caisse pour payer

### Fonctionnalités client
- **Annuler un article** (✕) : tant que la commande est "En attente"
- **Annuler la commande** (✕ Annuler) : tant que "En attente"
- **Demander l'addition** (🧾) : visible quand la commande est "Servie"
- **Restaurer sa session** : si fermeture du navigateur, scanner à nouveau

---

## 15. Dépannage

### Le QR code ne s'ouvre pas
- Vérifier `ADRESSE_IP` dans le fichier `.env`
- L'IP doit être celle du réseau local (ex: 192.168.1.7)
- Redémarrer le serveur après modification

### Le dashboard cuisine/bar n'est pas cliquable
- Vérifier que des commandes existent avec des articles cuisine/bar
- Le serveur doit d'abord **valider** la commande

### La caisse affiche 0.00 €
- Normal si c'est un nouveau caissier ou après une clôture
- Vérifier que des paiements ont été effectués

### Impossible de se connecter
- Vérifier le statut du compte (ACTIF)
- Vérifier le planning du jour (sauf Admin/Manager)
- Vérifier le mot de passe

### Le statut de commande ne change pas
- Vérifier que le bon rôle effectue l'action :
  - Validation → Serveur
  - En préparation → Cuisine ou Bar
  - Prêt article → Cuisine ou Bar
  - Servie → Serveur
  - Payée → Caissier

### Token expiré / déconnecté
- Le token JWT expire après 12h
- Se reconnecter

---

*Guide d'Utilisation — RestoPro v3.0 — Mai 2026*
