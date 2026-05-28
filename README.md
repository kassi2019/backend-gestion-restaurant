# RestoPro API

Backend API pour le système de gestion de restaurant avec commande par QR Code, notifications temps réel (Socket.IO) et affectation automatique des tables.

## Stack technique

| Composant     | Technologie      |
|---------------|------------------|
| Framework     | NestJS 10        |
| Base de données | MySQL            |
| ORM           | Prisma 4         |
| Temps réel    | Socket.IO 4      |
| Authentification | JWT + Passport + Bcrypt |
| QR Codes      | qrcode (npm)     |

## Prérequis

- Node.js 18+
- MySQL 8+
- npm

## Installation

```bash
$ npm install
```

## Configuration

Créer un fichier `.env` à la racine :

```env
DATABASE_URL="mysql://root:P@ssw0rd@localhost:3306/gestion_restaurant"
JWT_SECRET="votre-secret-jwt"
PORT=3000
ADRESSE_IP=0.0.0.0
```

- `ADRESSE_IP=0.0.0.0` écoute sur toutes les interfaces réseau (LAN et localhost)
- `ADRESSE_IP=192.168.x.x` pour une IP spécifique

## Base de données

```bash
# Appliquer les migrations
$ npx prisma migrate deploy

# Données de démonstration (restaurant, utilisateurs, menus, tables)
$ npm run seed
```

### Utilisateurs de test (après seed)

| Rôle      | Téléphone   | Mot de passe |
|-----------|-------------|--------------|
| Admin     | 0990000000  | 123456       |
| Serveur   | 0990000001  | 123456       |
| Cuisine   | 0990000002  | 123456       |
| Bar       | 0990000003  | 123456       |

## Lancement

```bash
# Développement (watch mode)
$ npm run start:dev

# Production
$ npm run build
$ npm run start:prod
```

Le serveur démarre sur `http://<ADRESSE_IP>:3000`.

## Structure du projet

```
src/
├── auth/            # Authentification (JWT, rôles, guards)
├── users/           # Gestion des utilisateurs
├── restaurant/      # Configuration du restaurant
├── tables/          # Gestion des tables et QR codes
├── menu/            # Menus, catégories, images
├── commandes/       # Cycle de vie des commandes
├── paiement/        # Paiements, factures, caisse
├── planning/        # Planning des employés
├── serveur-table/   # Affectation serveurs/tables
├── notifications/   # Centre de notifications
├── socket/          # Passerelle Socket.IO
├── statistiques/    # Dashboard et analytics
├── client/          # Pages client (HTML, QR codes)
└── prisma/          # Service Prisma global
```

## API — Aperçu

Toutes les routes sont préfixées par `/api` sauf les routes client (`/client`, `/qrcodes`, `/qr-table-*.png`).

| Module          | Préfixe             | Accès                        |
|-----------------|---------------------|------------------------------|
| Auth            | `/api/auth`         | Public + JWT                 |
| Users           | `/api/users`        | ADMIN, MANAGER               |
| Restaurants     | `/api/restaurants`  | Public + ADMIN               |
| Tables          | `/api/tables`       | JWT                          |
| Menu            | `/api/menu`         | Public + ADMIN, MANAGER      |
| Commandes       | `/api/commandes`    | Public + JWT                 |
| Paiements       | `/api/paiements`    | ADMIN, MANAGER, CAISSIER     |
| Planning        | `/api/planning`     | JWT                          |
| Serveur-Tables  | `/api/serveur-tables` | ADMIN, MANAGER, SERVEUR   |
| Notifications   | `/api/notifications`| JWT                          |
| Statistiques    | `/api/statistiques` | ADMIN, MANAGER               |
| Client          | `/client`, `/qrcodes` | Public                    |

## Fonctionnalités principales

- **QR Code** : chaque table a son QR code, scan → menu → commande
- **Temps réel** : Socket.IO avec toasts 3D et sonnerie de notification
- **Dashboard cuisine/bar** : FIFO avec timer, code couleur, "Tout prêt" par table
- **Double suivi** : statut commande + statut par article, transition auto PRETE
- **Restauration session client** : localStorage + fallback table, anti-fraîcheur 6h
- **Annulation client** : article ou commande entière tant que EN_ATTENTE
- **Demande d'addition** : bouton client visible quand SERVIE
- **Rôles** : Admin, Manager, Serveur, Cuisine, Bar, Caissier
- **Planning** : affectation automatique quotidienne des tables

## Fonctionnalités clés

- **QR Code** : URL absolue, scan → menu → commande
- **Sur place & À emporter** : comptoir T00, CMD-XXXX
- **Temps réel** : Socket.IO + toasts 3D + son + vibration
- **Dashboards dédiés** : Cuisine (FIFO), Bar, Caissier, Serveur
- **Double suivi** : statut commande + statut par article, auto-PRETE
- **Caisse** : clôture caissier (session personnelle) + clôture globale (admin)
- **Statistiques** : filtres par date, performance serveurs/caissiers
- **Planning** : obligatoire (sauf admin/manager), listes déroulantes
- **Restauration session** : localStorage + fallback table
- **Annulation client** : article ou commande avant validation
- **Rôles** : Admin, Manager, Serveur, Cuisine, Bar, Caissier

## Documentation

- [DOCUMENTATION.md](./DOCUMENTATION.md) — Parcours fonctionnel complet v3.0
- [Cahier_Des_Charges_Restaurant_QRCode_v2.md](./Cahier_Des_Charges_Restaurant_QRCode_v2.md) — Spécifications techniques v3.0
