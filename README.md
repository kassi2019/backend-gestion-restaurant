# RestoPro API

Backend API pour le système de gestion de restaurant avec commande par QR Code, assistant IA, notifications temps réel (Socket.IO), gestion des livraisons, réservations, et abonnements.

## Stack technique

| Composant       | Technologie             |
|-----------------|------------------------|
| Framework       | NestJS 10               |
| Base de données | MySQL                   |
| ORM             | Prisma 4                |
| Temps réel      | Socket.IO 4             |
| Authentification| JWT + Passport + Bcrypt |
| IA              | Claude (Anthropic SDK)  |
| QR Codes        | qrcode (npm)            |
| Impression      | ESC/POS (thermal printers) |

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
CODE_SECRET="votre-cle-aes-256"
ANTHROPIC_API_KEY="sk-ant-..."
SUPER_ADMIN_IDS=10
PORT=3000
ADRESSE_IP=0.0.0.0

# Paiement mobile
WAVE_NUMERO="+225 07 00 00 00 00"
OM_NUMERO="+225 01 00 00 00 00"
PAIEMENT_INSTRUCTIONS="Envoyez le montant par Wave ou Orange Money"

# Imprimante thermique
PRINTER_TYPE=NETWORK    # WINDOWS | NETWORK | USB
PRINTER_IP=192.168.1.100
PRINTER_PORT=9100
PRINTER_NAME=POS-80C
PRINTER_SHARE=\\PC\Printer
PRINTER_CHAR_WIDTH=42
AUTO_PRINT=true
```

- `ADRESSE_IP=0.0.0.0` écoute sur toutes les interfaces réseau (LAN et localhost)
- `ADRESSE_IP=192.168.x.x` pour une IP spécifique

## Base de données

```bash
# Appliquer les migrations
$ npx prisma migrate deploy

# Données de démonstration (restaurant, utilisateurs, menus, tables, modules)
$ npm run seed
```

### Utilisateurs de test (après seed)

| Rôle         | Téléphone   | Mot de passe |
|-------------|-------------|--------------|
| Super Admin | 0999999999  | 123456       |
| Admin       | 0990000000  | 123456       |
| Manager     | 0990000004  | 123456       |
| Réception   | 0990000005  | 123456       |
| Serveur     | 0990000001  | 123456       |
| Cuisine     | 0990000002  | 123456       |
| Bar         | 0990000003  | 123456       |
| Caissier    | 0990000006  | 123456       |
| Livreur     | 0990000007  | 123456       |

**Code activation test** : `RESTO-TEST-CODE` (30 jours)

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
├── activation/       # Abonnements, codes d'activation, plans, paiements
├── ai/               # Assistant IA de commande (Claude)
├── auth/             # Authentification (JWT, rôles, guards, Super Admin)
├── client/           # Pages client (HTML, QR codes)
├── commandes/        # Cycle de vie des commandes, livraisons
├── evaluations/      # Notation client (service, cuisine, ambiance)
├── menu/             # Menus, catégories, variantes, images, stock, CSV
├── notifications/    # Centre de notifications
├── paiement/         # Paiements, factures, caisse, remises
├── planning/         # Planning des employés
├── printer/          # Impression thermique ESC/POS
├── prisma/           # Service Prisma global
├── reservations/     # Réservations de tables
├── restaurant/       # Configuration du restaurant
├── serveur-table/    # Affectation serveurs/tables
├── socket/           # Passerelle Socket.IO
├── statistiques/     # Dashboard et analytics
├── tables/           # Gestion des tables et QR codes
├── users/            # Gestion des utilisateurs
└── zones/            # Zones tarifaires (Terrasse, Intérieur, VIP, Comptoir)
```

## API — Aperçu

Toutes les routes sont préfixées par `/api` sauf les routes client (`/client`, `/qrcodes`, `/qr-table-*.png`).

| Module           | Préfixe               | Accès                                  |
|------------------|-----------------------|----------------------------------------|
| Auth             | `/api/auth`           | Public + JWT + Super Admin             |
| Users            | `/api/users`          | SUPER_ADMIN, ADMIN, MANAGER            |
| Restaurants      | `/api/restaurants`    | Public + ADMIN                         |
| Tables           | `/api/tables`         | JWT                                    |
| Zones            | `/api/zones`          | ADMIN                                  |
| Menu             | `/api/menu`           | Public + ADMIN, MANAGER                |
| Commandes        | `/api/commandes`      | Public + JWT                           |
| Paiements        | `/api/paiements`      | ADMIN, MANAGER, CAISSIER               |
| Planning         | `/api/planning`       | JWT                                    |
| Serveur-Tables   | `/api/serveur-tables` | ADMIN, MANAGER, RECEPTIONNISTE         |
| Notifications    | `/api/notifications`  | JWT                                    |
| Statistiques     | `/api/statistiques`   | ADMIN, MANAGER, RECEPTIONNISTE         |
| Réservations     | `/api/reservations`   | ADMIN, MANAGER, RECEPTIONNISTE         |
| Évaluations      | `/api/evaluations`    | Public + ADMIN, MANAGER                |
| Printer          | `/api/printer`        | ADMIN, MANAGER, CAISSIER               |
| Client           | `/client`, `/qrcodes` | Public                                 |

## Rôles utilisateurs

| Rôle            | Périmètre                                              |
|-----------------|--------------------------------------------------------|
| **SUPER_ADMIN** | Supervision globale, abonnements, codes, plans, stats  |
| **ADMIN**       | Gestion complète du restaurant, clôture globale        |
| **MANAGER**     | Plannings, affectations, stats, menus, utilisateurs    |
| **RECEPTIONNISTE** | Accueil, réservations, création commandes, livraisons |
| **SERVEUR**     | Valider, servir, voir ses tables/commandes             |
| **CUISINE**     | Dashboard FIFO cuisine, gestion des préparations       |
| **BAR**         | Dashboard FIFO bar, gestion des boissons               |
| **CAISSIER**    | Paiements, factures, caisse, clôture caissier          |
| **LIVREUR**     | Livraisons assignées, mise à jour statut               |

## Fonctionnalités principales

- **QR Code** : chaque table a son QR code, scan → menu → commande
- **Assistant IA** : commande par texte ou voix via Claude (Anthropic)
- **Temps réel** : Socket.IO avec toasts 3D, son et vibration
- **Dashboard cuisine/bar** : FIFO avec timer, code couleur, "Tout prêt" par table
- **Double suivi** : statut commande + statut par article, transition auto PRETE
- **Variantes menu** : options avec prix distincts (ex: avec/sans alcool)
- **Zones tarifaires** : coefficients de prix par zone (Terrasse, VIP, etc.)
- **Livraison** : gestion complète avec livreurs, statuts, frais
- **Réservations** : réservation de tables avec statuts
- **Évaluations** : notation client (service, cuisine, ambiance)
- **Caisse directe** : commande et paiement immédiat au comptoir
- **Remises** : réductions en % ou montant fixe
- **Impression thermique** : tickets cuisine/bar et reçus caisse (ESC/POS)
- **Device ID** : suivi des commandes par appareil client
- **Mode réception** : gestion par réceptionniste (alternative au mode serveur)
- **Modules dynamiques** : visibilité par utilisateur et par restaurant
- **Abonnement** : trial 14j, plans mensuels/trimestriels/annuels, codes AES
- **Clôture caisse** : par caissier (shift) ou globale (fermeture restaurant)
- **Statistiques** : dashboard, ventes, plats populaires, performance, affluence
- **Mot de passe oublié** : réinitialisation par téléphone

## Documentation

- [DOCUMENTATION.md](./DOCUMENTATION.md) — Parcours fonctionnel complet v4.0
- [GUIDE_UTILISATION.md](./GUIDE_UTILISATION.md) — Guide d'utilisation complet v5.0
- [Cahier_Des_Charges_Restaurant_QRCode_v2.md](./Cahier_Des_Charges_Restaurant_QRCode_v2.md) — Spécifications techniques v3.0
