# CAHIER DES CHARGES
## Application Mobile de Gestion de Restaurant avec Système QR Code

> Solution digitale complète pour la modernisation de la restauration

**Version 2.0 — Mai 2026**

---

## Table des matières

1. [Objectifs du Projet](#1-objectifs-du-projet)
2. [Fonctionnement Général](#2-fonctionnement-général)
3. [Gestion des Tables et Serveurs](#3-gestion-des-tables-et-serveurs)
4. [Gestion des Notifications](#4-gestion-des-notifications)
5. [Gestion des Catégories de Service](#5-gestion-des-catégories-de-service)
6. [Technologies Recommandées](#6-technologies-recommandées)
7. [Structure de la Base de Données](#7-structure-de-la-base-de-données)
8. [Avis et Recommandations](#8-avis-et-recommandations)
9. [Gestion du Planning et Affectation Dynamique des Serveurs](#9-gestion-du-planning-et-affectation-dynamique-des-serveurs)
10. [Fonctionnement de l'Affectation Automatique](#10-fonctionnement-de-laffectation-automatique)
11. [Gestion des Horaires](#11-gestion-des-horaires)
12. [Interfaces des Différents Acteurs](#12-interfaces-des-différents-acteurs)
13. [Nouvelles Tables Base de Données](#13-nouvelles-tables-base-de-données)
14. [Gestion des Connexions et Authentification](#14-gestion-des-connexions-et-authentification)
15. [Fonctionnalités Détaillées](#15-fonctionnalités-détaillées)
16. [Explication du Fonctionnement Temps Réel](#16-explication-du-fonctionnement-temps-réel)
17. [Routes API](#17-routes-api)
18. [Conclusion Générale](#18-conclusion-générale)

---

## 1. Objectifs du Projet

Cette application permet de digitaliser la gestion des restaurants grâce à un système de QR Code, de gestion des tables, de commandes en temps réel et de notifications intelligentes.

- Digitaliser les menus des restaurants
- Permettre aux clients de commander via QR Code
- Gérer les tables et les serveurs
- Notifier les serveurs et la cuisine en temps réel
- Améliorer l'expérience client
- Réduire les erreurs de commande

---

## 2. Fonctionnement Général

Le parcours client se déroule en 8 étapes clés :

1. Le client scanne le QR Code placé sur la table
2. Le système génère une session unique (format `TB{idTable}-{timestamp}`)
3. Le client consulte le menu
4. Le client passe sa commande (clientRef optionnel pour identifier les personnes)
5. Le serveur reçoit une notification
6. Le serveur valide la commande → la table passe OCCUPEE
7. La cuisine et le bar reçoivent les commandes selon les catégories
8. Le caissier encaisse → la table redevient LIBRE si plus aucune commande active

---

## 3. Gestion des Tables et Serveurs

- Chaque table est affectée à un serveur
- Un serveur peut gérer plusieurs tables
- Le manager peut transférer une table à un autre serveur
- Le transfert peut être unitaire (une table) ou global (toutes les tables d'un serveur absent)
- Le serveur reçoit les notifications liées à ses tables

---

## 4. Gestion des Notifications

Événements Socket.IO :

| Événement | Salle/Destinataire | Description |
|---|---|---|
| `nouvelle_commande` | `serveur:{userId}` | Nouvelle commande client |
| `nouvelle_commande_cuisine` | `cuisine` | Plats à préparer |
| `nouvelle_commande_bar` | `bar` | Boissons à préparer |
| `commande_status_change` | `serveur:{userId}`, `admin` | Changement de statut |
| `notification_user` | `serveur:{userId}` | Notification individuelle |
| `notification_admin` | `admin` | Notification admin/manager |

Les notifications sont également persistées en base de données (table `notifications`) et consultables via l'API REST.

---

## 5. Gestion des Catégories de Service

| Catégorie        | Destination |
|------------------|-------------|
| Boissons         | BAR         |
| Entrées          | CUISINE     |
| Plats principaux | CUISINE     |
| Desserts         | DESSERT     |

---

## 6. Technologies Recommandées

| Composant        | Technologie  |
|------------------|--------------|
| Frontend Mobile  | React Native |
| Backend          | NestJS 10    |
| Base de données  | MySQL 8      |
| Temps réel       | Socket.IO 4  |
| ORM              | Prisma 4     |

---

## 7. Structure de la Base de Données

### Table : `restaurants`

| Champ     | Type      | Description           |
|-----------|-----------|-----------------------|
| id        | INT (PK)  | Clé primaire          |
| nom       | VARCHAR   | Nom du restaurant     |
| adresse   | TEXT      | Adresse               |
| devise    | VARCHAR   | Devise (€, FCFA, $…)  |
| telephone | VARCHAR   | Téléphone             |

### Table : `utilisateurs`

| Champ         | Type      | Description                                      |
|---------------|-----------|--------------------------------------------------|
| id            | INT (PK)  | Clé primaire                                     |
| nom           | VARCHAR   | Nom utilisateur                                  |
| telephone     | VARCHAR   | Téléphone (unique)                               |
| mot_de_passe  | VARCHAR   | Mot de passe hashé (Bcrypt)                      |
| role          | ENUM      | ADMIN, MANAGER, SERVEUR, CUISINE, BAR, CAISSIER  |
| statut        | ENUM      | ACTIF, INACTIF, CONGE, SUSPENDU                  |
| photo         | TEXT      | Photo de profil (URL)                            |
| restaurant_id | INT (FK)  | Restaurant d'appartenance                        |
| date_creation | DATETIME  | Date de création                                 |

### Table : `tables_restaurant`

| Champ         | Type      | Description              |
|---------------|-----------|--------------------------|
| id            | INT (PK)  | Clé primaire             |
| numero        | VARCHAR   | Numéro de table          |
| zone          | VARCHAR   | Zone (Terrasse, Intérieur, VIP…) |
| statut        | ENUM      | LIBRE, OCCUPEE, RESERVEE |
| serveur_id    | INT (FK)  | Serveur affecté          |
| qr_code       | TEXT      | Données QR code          |
| restaurant_id | INT (FK)  | Restaurant               |

### Table : `categories_menu`

| Champ         | Type      | Description                   |
|---------------|-----------|-------------------------------|
| id            | INT (PK)  | Clé primaire                  |
| nom           | VARCHAR   | Nom catégorie                 |
| ordre_service | INT       | Ordre d'affichage             |
| destination   | ENUM      | BAR, CUISINE, DESSERT         |
| restaurant_id | INT (FK)  | Restaurant                    |

### Table : `menus`

| Champ             | Type      | Description          |
|-------------------|-----------|----------------------|
| id                | INT (PK)  | Clé primaire         |
| nom               | VARCHAR   | Nom du plat          |
| prix              | DECIMAL   | Prix                 |
| image             | TEXT      | URL image            |
| categorie_id      | INT (FK)  | Catégorie            |
| temps_preparation | INT       | Minutes (défaut: 15) |
| disponibilite     | BOOLEAN   | Disponible (défaut: true) |
| restaurant_id     | INT (FK)  | Restaurant           |

### Table : `sessions_clients`

| Champ          | Type      | Description              |
|----------------|-----------|--------------------------|
| id             | INT (PK)  | Clé primaire             |
| session_key    | VARCHAR   | Clé unique (ex: TB3-XXX) |
| table_id       | INT (FK)  | Table concernée          |
| date_arrivee   | DATETIME  | Heure d'arrivée          |
| statut         | ENUM      | ACTIVE, TERMINEE         |
| utilisateur_id | INT (FK)  | Utilisateur lié (optionnel) |

### Table : `commandes`

| Champ           | Type      | Description                          |
|-----------------|-----------|--------------------------------------|
| id              | INT (PK)  | Clé primaire                         |
| table_id        | INT (FK)  | Table                                |
| serveur_id      | INT (FK)  | Serveur responsable                  |
| session_id      | INT (FK)  | Session client                       |
| statut          | ENUM      | EN_ATTENTE, VALIDEE, EN_PREPARATION, PRETE, SERVIE, PAYEE, ANNULEE |
| montant_total   | DECIMAL   | Montant total                        |
| date_commande   | DATETIME  | Date de commande                     |
| mode_paiement   | ENUM      | ESPECES, MOBILE_MONEY, CARTE_BANCAIRE |
| statut_paiement | ENUM      | NON_PAYEE, PAYEE, REMBOURSEE         |
| date_paiement   | DATETIME  | Date de paiement                     |
| caissier_id     | INT (FK)  | Caissier ayant encaissé              |
| client_ref      | VARCHAR   | Référence client (ex: CLI-A7B2)      |

### Table : `commande_details`

| Champ              | Type      | Description                    |
|--------------------|-----------|--------------------------------|
| id                 | INT (PK)  | Clé primaire                   |
| commande_id        | INT (FK)  | Commande                       |
| menu_id            | INT (FK)  | Article commandé               |
| quantite           | INT       | Quantité                       |
| prix               | DECIMAL   | Prix unitaire                  |
| statut_preparation | ENUM      | EN_PREPARATION (défaut), PRET  |

### Table : `factures`

| Champ         | Type      | Description          |
|---------------|-----------|----------------------|
| id            | INT (PK)  | Clé primaire         |
| numero        | VARCHAR   | N° unique (FAC-AAAAMMJJ-XXXX) |
| commande_id   | INT (FK)  | Commande liée        |
| montant_total | DECIMAL   | Montant facturé      |
| mode_paiement | ENUM      | ESPECES, MOBILE_MONEY, CARTE_BANCAIRE |
| date_facture  | DATETIME  | Date d'émission      |
| caissier_id   | INT (FK)  | Caissier             |

### Table : `notifications`

| Champ             | Type      | Description          |
|-------------------|-----------|----------------------|
| id                | INT (PK)  | Clé primaire         |
| utilisateur_id    | INT (FK)  | Destinataire         |
| message           | TEXT      | Contenu              |
| lu                | BOOLEAN   | Lecture (défaut: false) |
| date_notification | DATETIME  | Date                 |

---

## 8. Avis et Recommandations

Ce projet possède un très fort potentiel car il modernise la gestion des restaurants et améliore considérablement l'expérience client. Il est recommandé de commencer par une version MVP avec les fonctionnalités essentielles avant d'ajouter des fonctionnalités avancées comme l'intelligence artificielle, la fidélité client et les statistiques avancées.

---

## 9. Gestion du Planning et Affectation Dynamique des Serveurs

Le système intègre une gestion intelligente des plannings :

- Chaque serveur possède un calendrier de travail
- Le planning est défini par jour et par heure
- Un serveur sans planning du jour ne peut pas se connecter
- Les tables d'un serveur absent sont automatiquement réaffectées
- Le manager peut modifier les affectations manuellement
- La vérification quotidienne est déclenchée manuellement ou par cron

---

## 10. Fonctionnement de l'Affectation Automatique

- Le système vérifie chaque jour les serveurs programmés
- Les utilisateurs non programmés sont automatiquement désactivés pour le service
- Le système libère automatiquement leurs tables
- Les tables sont redistribuées aux serveurs actifs
- Les nouvelles commandes sont envoyées uniquement aux serveurs disponibles

---

## 11. Gestion des Horaires

| Service        | Heure Début | Heure Fin |
|----------------|-------------|-----------|
| Service Matin  | 08h00       | 12h00     |
| Service Midi   | 12h00       | 16h00     |
| Service Soir   | 16h00       | 23h00     |
| Service Nuit   | 23h00       | 05h00     |

---

## 12. Interfaces des Différents Acteurs

### Administrateur
- Gestion des utilisateurs
- Gestion des restaurants
- Gestion des rôles
- Configuration générale

### Manager
- Création des plannings
- Affectation des tables
- Suivi des serveurs
- Statistiques

### Serveur
- Voir ses tables
- Recevoir les commandes
- Valider les commandes
- Notifier les clients

### Cuisine
- Voir les plats à préparer
- Changer le statut des commandes et détails
- Notifier que les plats sont prêts

### Bar
- Voir les boissons à préparer
- Notifier les boissons prêtes

### Caissier
- Gestion des paiements
- Impression des factures
- Clôture de caisse

### Client
- Scanner le QR Code
- Voir les menus
- Passer commande
- Suivre les commandes en temps réel

---

## 13. Nouvelles Tables Base de Données

### Table : `plannings`

| Champ          | Type | Description           |
|----------------|------|-----------------------|
| id             | INT  | Clé primaire          |
| utilisateur_id | INT  | Serveur concerné      |
| jour           | DATE | Jour de travail       |
| heure_debut    | TIME | Début service         |
| heure_fin      | TIME | Fin service           |
| statut         | ENUM | ACTIF, ABSENT, CONGE  |

### Table : `serveur_tables`

| Champ            | Type     | Description      |
|------------------|----------|------------------|
| id               | INT      | Clé primaire     |
| utilisateur_id   | INT      | Serveur          |
| table_id         | INT      | Table assignée   |
| date_affectation | DATETIME | Date affectation |
| statut           | ENUM     | ACTIF, INACTIF   |

---

## 14. Gestion des Connexions et Authentification

### 14.1 Types d'Utilisateurs et Connexion

| Acteur         | Connexion Requise ? | Méthode                     |
|----------------|---------------------|-----------------------------|
| Client         | Non                 | Session QR Code automatique |
| Serveur        | Oui                 | Téléphone + Mot de passe    |
| Cuisine        | Oui                 | Téléphone + Mot de passe    |
| Bar            | Oui                 | Téléphone + Mot de passe    |
| Manager        | Oui                 | Téléphone + Mot de passe    |
| Caissier       | Oui                 | Téléphone + Mot de passe    |
| Administrateur | Oui                 | Téléphone + Mot de passe    |

### 14.2 Pourquoi le Client ne se Connecte pas ?

Le client doit avoir une expérience rapide et fluide :
- Scan QR Code → Menu → Commande
- Aucune inscription requise
- Aucun mot de passe à mémoriser

Le système utilise une session temporaire avec une clé unique générée automatiquement (ex. : `TB5-LD8KX2M`) qui permet de :
- Suivre les commandes en cours
- Envoyer les notifications client
- Gérer le panier

### 14.3 Connexion des Employés

Authentification par numéro de téléphone + mot de passe :
- Tout le monde possède un téléphone
- Plus simple et accessible qu'un email
- Plus rapide à saisir

### 14.4 Processus de Connexion (Employés)

| Étape | Action                      | Détail                                                  |
|-------|-----------------------------|---------------------------------------------------------|
| 1     | Ouverture de l'application  | L'employé ouvre l'interface de connexion                |
| 2     | Saisie des identifiants     | Numéro de téléphone + mot de passe                      |
| 3     | Vérification backend        | Compte existant, mot de passe correct, utilisateur ACTIF |
| 4     | Vérification planning       | SERVEUR : planning ACTIF aujourd'hui requis             |
| 5     | Retour système              | Token JWT + informations utilisateur + restaurant       |

**Réponse backend :**

```json
{
  "token": "jwt_token",
  "utilisateur": {
    "id": 2,
    "nom": "Jean",
    "telephone": "0990000001",
    "role": "SERVEUR",
    "photo": null,
    "restaurantId": 1,
    "devise": "€",
    "restaurantNom": "RestoPro Demo",
    "restaurantTelephone": null
  }
}
```

### 14.5 Gestion des Permissions par Rôle

| Rôle     | Accès autorisé                        |
|----------|---------------------------------------|
| SERVEUR  | Ses tables et commandes uniquement    |
| CUISINE  | Commandes cuisine uniquement          |
| BAR      | Boissons uniquement                   |
| MANAGER  | Planning, affectations, statistiques  |
| CAISSIER | Paiements et facturation              |
| ADMIN    | Accès complet au système              |

### 14.6 Gestion du Statut des Utilisateurs

| Statut    | Signification                          |
|-----------|----------------------------------------|
| ACTIF     | Employé disponible pour le service     |
| INACTIF   | Employé désactivé temporairement       |
| CONGE     | Employé en congé                       |
| SUSPENDU  | Accès suspendu par l'administrateur    |

### 14.7 Double Vérification à la Connexion

Même si un employé connaît son mot de passe, le système effectue une double vérification :

1. Statut du compte (`ACTIF` requis)
2. Planning du jour (service programmé requis pour SERVEUR uniquement)

> **Exception** : ADMIN, MANAGER, CUISINE, BAR et CAISSIER peuvent se connecter sans planning du jour.

### 14.8 Technologies d'Authentification

| Couche              | Technologie       | Usage                              |
|---------------------|-------------------|------------------------------------|
| Backend (NestJS)    | JWT Authentication | Génération et validation des tokens |
| Backend (NestJS)    | Passport JWT      | Stratégie d'authentification       |
| Backend (NestJS)    | Bcrypt            | Hashage des mots de passe          |
| Mobile (React Native) | AsyncStorage    | Stockage du token                  |

### 14.9 Sécurité

- Hashage systématique des mots de passe (Bcrypt, 10 rounds)
- Expiration automatique des tokens JWT (12h)
- Gestion de la déconnexion forcée via changement de statut
- Limitation des accès selon le rôle (Guards NestJS)
- Aucune donnée sensible stockée côté client
- CORS configuré pour toutes les origines

---

## 15. Fonctionnalités Détaillées

### Gestion des Menus
- Création et modification des plats
- Gestion des prix et disponibilités
- Catégorisation des plats (avec destination CUISINE/BAR/DESSERT)
- Upload des images (JPEG, PNG, WEBP)
- Activation/désactivation des plats

### Gestion des Tables
- Création et numérotation des tables
- Affectation des serveurs
- Suivi du statut (LIBRE/OCCUPEE/RESERVEE)
- Génération automatique des QR Codes (PNG + page HTML)

### Gestion des Commandes
- Réception des commandes en temps réel
- Validation par le serveur (la table passe OCCUPEE)
- Routage automatique cuisine/bar selon les catégories
- Suivi à deux niveaux : commande (statut global) + détails (statut préparation)

### Gestion de la Cuisine
- La cuisine reçoit les plats CUISINE et DESSERT
- Les cuisiniers changent le statut des commandes et des détails
- Filtrage automatique : exclut EN_ATTENTE, ANNULEE, PAYEE, SERVIE

### Gestion du Bar
- Le bar reçoit uniquement les boissons (destination BAR)
- Suivi des boissons en préparation
- Même logique de filtrage que la cuisine

### Gestion des Paiements
- Paiement Mobile Money
- Paiement espèces
- Paiement carte bancaire
- Génération de factures (format FAC-AAAAMMJJ-XXXX)
- Impression HTML des factures
- Clôture de caisse journalière

### Gestion des Statistiques
- Dashboard temps réel (commandes par statut)
- Statistiques des ventes (filtrables par période)
- Plats les plus vendus
- Performance des serveurs
- Affluence horaire

### Gestion des Rôles
- ADMIN : accès complet
- MANAGER : planning, affectations, stats
- SERVEUR : tables et commandes assignées
- CUISINE : plats cuisine/dessert
- BAR : boissons
- CAISSIER : paiements et factures

### Gestion Temps Réel
- Socket.IO avec rooms par rôle
- Mise à jour instantanée des commandes
- Notifications en direct (toasts)
- Persistance des notifications en base

---

## 16. Explication du Fonctionnement Temps Réel

Le système utilise **Socket.IO** pour la communication temps réel.

### Architecture des rooms

| Room              | Membres                          |
|-------------------|----------------------------------|
| `serveur:{userId}`| Un serveur spécifique            |
| `cuisine`         | Tous les cuisiniers              |
| `bar`             | Tous les barmen                  |
| `admin`           | Admins et managers               |
| `table:{tableId}` | Client(s) d'une table            |

### Flux d'événements

1. Client envoie commande → `POST /api/commandes/client`
2. Backend notifie `serveur:{id}` → `nouvelle_commande`
3. Backend notifie `cuisine` ou `bar` selon contenu
4. Backend sauvegarde notification en base
5. Statut changé → `commande_status_change` vers serveur + admin
6. Client reçoit mise à jour via `table:{tableId}`

---

## 17. Routes API

Préfixe global : `/api` (sauf routes client et QR codes)

### Auth (`/api/auth`)
| Méthode | Route             | Accès   |
|---------|-------------------|---------|
| POST    | /login            | Public  |
| POST    | /register         | Public  |
| GET     | /profile          | JWT     |
| PATCH   | /profile          | JWT     |
| POST    | /photo            | JWT     |
| PATCH   | /password         | JWT     |
| POST    | /forgot-password  | Public  |

### Users (`/api/users`) — ADMIN, MANAGER
| Méthode | Route             |
|---------|-------------------|
| GET     | /                 |
| GET     | /role/:role       |
| PATCH   | /:id              |
| PATCH   | /:id/statut       |

### Restaurants (`/api/restaurants`)
| Méthode | Route         | Accès         |
|---------|---------------|---------------|
| GET     | /public/:id   | Public        |
| GET     | /             | ADMIN         |
| GET     | /:id          | JWT           |
| POST    | /             | ADMIN         |
| PATCH   | /:id          | ADMIN         |

### Tables (`/api/tables`) — JWT
| Méthode | Route            | Accès                |
|---------|------------------|----------------------|
| GET     | /                | ADMIN, MANAGER, SERVEUR |
| GET     | /serveur         | ADMIN, MANAGER, SERVEUR |
| POST    | /                | ADMIN, MANAGER       |
| PATCH   | /:id             | ADMIN, MANAGER       |
| DELETE  | /:id             | ADMIN, MANAGER       |
| PATCH   | /:id/assign      | ADMIN, MANAGER       |
| PATCH   | /:id/statut      | ADMIN, MANAGER, SERVEUR |
| GET     | /:id/qrcode      | ADMIN, MANAGER, SERVEUR |

### Menu (`/api/menu`)
| Méthode | Route                  | Accès          |
|---------|------------------------|----------------|
| GET     | /public/:restaurantId  | Public         |
| GET     | /                      | ADMIN, MANAGER |
| POST    | /                      | ADMIN, MANAGER |
| PATCH   | /:id                   | ADMIN, MANAGER |
| DELETE  | /:id                   | ADMIN, MANAGER |
| PATCH   | /:id/toggle            | ADMIN, MANAGER |
| POST    | /:id/image             | ADMIN, MANAGER |
| GET     | /categories            | ADMIN, MANAGER |
| POST    | /categories            | ADMIN, MANAGER |

### Commandes (`/api/commandes`)
| Méthode | Route                    | Accès                          |
|---------|--------------------------|--------------------------------|
| POST    | /client                  | Public                         |
| GET     | /                        | ADMIN, MANAGER                 |
| GET     | /serveur                 | ADMIN, MANAGER, SERVEUR        |
| GET     | /cuisine                 | CUISINE                        |
| GET     | /bar                     | BAR                            |
| PATCH   | /:id/statut              | ADMIN, MANAGER, SERVEUR (statut global) |
| PATCH   | /details/:id/statut      | CUISINE, BAR (statut détail)   |
| GET     | /session/:sessionId      | Public                         |
| GET     | /client-session/:sessionKey | Public                      |
| GET     | /table/:tableId          | ADMIN, MANAGER, SERVEUR        |
| GET     | /stats                   | ADMIN, MANAGER, SERVEUR, CUISINE, BAR |

### Paiements (`/api/paiements`) — ADMIN, MANAGER, CAISSIER
| Méthode | Route                   |
|---------|-------------------------|
| GET     | /a-payer                |
| POST    | /payer/:commandeId      |
| GET     | /factures               |
| GET     | /factures/:id           |
| GET     | /factures/:id/imprimer  |
| GET     | /caisse/jour            |
| POST    | /caisse/cloture         |

### Planning (`/api/planning`) — JWT
| Méthode | Route        | Accès                |
|---------|--------------|----------------------|
| GET     | /            | ADMIN, MANAGER       |
| POST    | /            | ADMIN, MANAGER       |
| GET     | /mine        | JWT (tous rôles)     |
| GET     | /date/:date  | ADMIN, MANAGER       |
| PATCH   | /:id         | ADMIN, MANAGER       |
| DELETE  | /:id         | ADMIN, MANAGER       |

### Serveur-Tables (`/api/serveur-tables`) — ADMIN, MANAGER
| Méthode | Route            | Accès                       |
|---------|------------------|-----------------------------|
| GET     | /                | ADMIN, MANAGER              |
| GET     | /serveur         | ADMIN, MANAGER, SERVEUR     |
| GET     | /table/:tableId  | ADMIN, MANAGER              |
| POST    | /                | ADMIN, MANAGER              |
| POST    | /bulk            | ADMIN, MANAGER              |
| DELETE  | /:tableId        | ADMIN, MANAGER              |
| PATCH   | /reassign        | ADMIN, MANAGER              |
| POST    | /run-check       | ADMIN, MANAGER              |

### Notifications (`/api/notifications`) — JWT
| Méthode | Route         |
|---------|---------------|
| GET     | /             |
| PATCH   | /:id/read     |
| PATCH   | /read-all     |

### Statistiques (`/api/statistiques`) — ADMIN, MANAGER
| Méthode | Route                 |
|---------|-----------------------|
| GET     | /dashboard            |
| GET     | /ventes               |
| GET     | /plats-populaires     |
| GET     | /performance-serveurs |
| GET     | /affluence            |

### Client (Public, pas de préfixe /api)
| Méthode | Route               | Description        |
|---------|---------------------|--------------------|
| GET     | /client             | Page HTML client   |
| GET     | /qrcodes            | Page QR codes      |
| GET     | /qr-table-:id.png   | QR code PNG        |

---

## 18. Conclusion Générale

Cette application représente une solution moderne et intelligente de gestion de restaurant. Elle permet d'améliorer l'organisation, la rapidité du service et l'expérience client grâce aux QR Codes, au temps réel et à l'automatisation des processus.

Le système intègre une gestion complète des connexions et authentifications, garantissant la sécurité des accès tout en offrant une expérience fluide pour les clients et les employés. La séparation cuisine/bar, le suivi à deux niveaux (commande + détails), et l'affectation dynamique des serveurs en font un outil adapté aux réalités du terrain.

---

*Cahier des Charges — Application Restaurant QR Code — Version 2.0 — Mai 2026*
