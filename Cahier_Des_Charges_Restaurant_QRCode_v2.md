# CAHIER DES CHARGES
## Application Mobile de Gestion de Restaurant avec Système QR Code

> Solution digitale complète pour la modernisation de la restauration

**Version 1.0 — 2025**

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
17. [Conclusion Générale](#17-conclusion-générale)

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
2. Le système génère une session unique
3. Le client consulte le menu
4. Le client passe sa commande
5. Le serveur reçoit une notification
6. Le serveur valide la commande
7. Le client reçoit une notification de validation
8. La cuisine et le bar reçoivent les commandes selon les catégories

---

## 3. Gestion des Tables et Serveurs

- Chaque table est affectée à un serveur
- Un serveur peut gérer plusieurs tables
- Le manager peut transférer une table à un autre serveur
- Le serveur reçoit les notifications liées à ses tables

---

## 4. Gestion des Notifications

- Commande envoyée
- Commande validée
- Commande en préparation
- Commande prête
- Produit indisponible

---

## 5. Gestion des Catégories de Service

| Catégorie        | Destination |
|------------------|-------------|
| Boissons         | Bar         |
| Entrées          | Cuisine     |
| Plats principaux | Cuisine     |
| Desserts         | Dessert     |

---

## 6. Technologies Recommandées

| Composant        | Technologie  |
|------------------|--------------|
| Frontend Mobile  | React Native |
| Backend          | NestJS       |
| Base de données  | MySQL        |
| Temps réel       | Socket.IO    |
| ORM              | Prisma       |

---

## 7. Structure de la Base de Données

### Table : `restaurants`

| Champ   | Type    | Description           |
|---------|---------|-----------------------|
| id      | INT     | Clé primaire          |
| nom     | VARCHAR | Nom du restaurant     |
| adresse | TEXT    | Adresse du restaurant |

### Table : `utilisateurs`

| Champ        | Type    | Description                                      |
|--------------|---------|--------------------------------------------------|
| id           | INT     | Clé primaire                                     |
| nom          | VARCHAR | Nom utilisateur                                  |
| telephone    | VARCHAR | Téléphone                                        |
| mot_de_passe | VARCHAR | Mot de passe hashé                               |
| role         | ENUM    | ADMIN, MANAGER, SERVEUR, CUISINE, BAR, CAISSIER  |
| statut       | ENUM    | ACTIF, INACTIF, CONGE, SUSPENDU                  |
| photo        | TEXT    | Photo de profil                                  |

### Table : `tables_restaurant`

| Champ      | Type    | Description           |
|------------|---------|-----------------------|
| id         | INT     | Clé primaire          |
| numero     | VARCHAR | Numéro de table       |
| zone       | VARCHAR | Zone du restaurant    |
| statut     | ENUM    | LIBRE, OCCUPEE, RESERVEE |
| serveur_id | INT     | Serveur affecté       |
| qr_code    | TEXT    | QR Code de la table   |

### Table : `categories_menu`

| Champ         | Type    | Description          |
|---------------|---------|----------------------|
| id            | INT     | Clé primaire         |
| nom           | VARCHAR | Nom catégorie        |
| ordre_service | INT     | Ordre de service     |
| destination   | VARCHAR | BAR, CUISINE, DESSERT |

### Table : `menus`

| Champ             | Type    | Description          |
|-------------------|---------|----------------------|
| id                | INT     | Clé primaire         |
| nom               | VARCHAR | Nom du plat          |
| prix              | DECIMAL | Prix du plat         |
| image             | TEXT    | Image du plat        |
| categorie_id      | INT     | Référence catégorie  |
| temps_preparation | INT     | Temps de préparation |
| disponibilite     | BOOLEAN | Disponibilité        |

### Table : `sessions_clients`

| Champ        | Type     | Description        |
|--------------|----------|--------------------|
| id           | INT      | Clé primaire       |
| session_key  | VARCHAR  | Clé session unique |
| table_id     | INT      | Table concernée    |
| date_arrivee | DATETIME | Heure d'arrivée    |

### Table : `commandes`

| Champ          | Type     | Description                    |
|----------------|----------|--------------------------------|
| id             | INT      | Clé primaire                   |
| table_id       | INT      | Table concernée                |
| serveur_id     | INT      | Serveur responsable            |
| session_id     | INT      | Session client                 |
| statut         | ENUM     | EN_ATTENTE, VALIDEE, PRETE     |
| montant_total  | DECIMAL  | Montant total                  |
| date_commande  | DATETIME | Date commande                  |

### Table : `commande_details`

| Champ               | Type    | Description               |
|---------------------|---------|---------------------------|
| id                  | INT     | Clé primaire              |
| commande_id         | INT     | Commande                  |
| menu_id             | INT     | Plat                      |
| quantite            | INT     | Quantité                  |
| prix                | DECIMAL | Prix unitaire             |
| statut_preparation  | ENUM    | EN_PREPARATION, PRET      |

### Table : `notifications`

| Champ              | Type     | Description          |
|--------------------|----------|----------------------|
| id                 | INT      | Clé primaire         |
| utilisateur_id     | INT      | Utilisateur concerné |
| message            | TEXT     | Contenu notification |
| lu                 | BOOLEAN  | Notification lue     |
| date_notification  | DATETIME | Date                 |

---

## 8. Avis et Recommandations

Ce projet possède un très fort potentiel car il modernise la gestion des restaurants et améliore considérablement l'expérience client. Il est recommandé de commencer par une version MVP avec les fonctionnalités essentielles avant d'ajouter des fonctionnalités avancées comme l'intelligence artificielle, la fidélité client et les statistiques avancées.

---

## 9. Gestion du Planning et Affectation Dynamique des Serveurs

Le système doit intégrer une gestion intelligente des plannings afin de gérer les horaires de travail des serveurs et l'affectation automatique des tables.

- Chaque serveur possède un calendrier de travail
- Le planning est défini par jour et par heure
- Un serveur actif aujourd'hui peut être désactivé demain selon le planning
- Les tables d'un serveur absent sont automatiquement réaffectées
- Le manager peut modifier les affectations manuellement
- Les horaires peuvent être configurés par service (matin, midi, soir)

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
- Changer le statut des commandes
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

La connexion dépend du type d'utilisateur dans le système. Tous les acteurs n'ont pas la même manière de se connecter.

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

Le client doit avoir une expérience rapide et fluide. Le parcours est simplifié :

- Scan QR Code → Menu → Commande
- Aucune inscription requise
- Aucun mot de passe à mémoriser
- Aucun compte à créer

Le système utilise une session temporaire avec une clé unique générée automatiquement (ex. : `TB12-XA78-KL55`) qui permet de :

- Suivre les commandes en cours
- Envoyer les notifications client
- Gérer le panier

### 14.3 Connexion des Employés

Les employés doivent avoir un compte sécurisé. L'authentification se fait par numéro de téléphone, particulièrement adapté au contexte africain :

- Tout le monde possède un téléphone
- Plus simple et accessible qu'un email
- Plus rapide à saisir

### 14.4 Processus de Connexion (Employés)

| Étape | Action                      | Détail                                                  |
|-------|-----------------------------|---------------------------------------------------------|
| 1     | Ouverture de l'application  | L'employé ouvre l'interface de connexion                |
| 2     | Saisie des identifiants     | Numéro de téléphone + mot de passe                      |
| 3     | Vérification backend        | Compte existant, mot de passe correct, utilisateur actif |
| 4     | Retour système              | Token JWT + informations utilisateur + permissions       |

**Exemple de réponse backend :**

```json
{
  "token": "jwt_token",
  "utilisateur": {
    "nom": "Jean",
    "role": "SERVEUR"
  }
}
```

### 14.5 Gestion des Permissions par Rôle

| Rôle     | Accès autorisé                        |
|----------|---------------------------------------|
| SERVEUR  | Ses tables uniquement                 |
| CUISINE  | Commandes cuisine uniquement          |
| BAR      | Boissons uniquement                   |
| MANAGER  | Planning, affectations, statistiques  |
| CAISSIER | Paiements et facturation              |
| ADMIN    | Accès complet au système              |

### 14.6 Gestion du Statut des Utilisateurs

La table `utilisateurs` inclut un champ `statut` permettant de gérer la disponibilité des employés :

| Statut    | Signification                          |
|-----------|----------------------------------------|
| ACTIF     | Employé disponible pour le service     |
| INACTIF   | Employé désactivé temporairement       |
| CONGE     | Employé en congé                       |
| SUSPENDU  | Accès suspendu par l'administrateur    |

### 14.7 Double Vérification à la Connexion

Même si un employé connaît son mot de passe, le système effectue une double vérification :

1. Statut du compte (`ACTIF` requis)
2. Planning du jour (service programmé requis)

> **Exemple :** Si Jean n'est pas programmé aujourd'hui :
> ```
> Aucun service programmé aujourd'hui. Connexion refusée.
> ```

### 14.8 Technologies d'Authentification Recommandées

| Couche              | Technologie       | Usage                              |
|---------------------|-------------------|------------------------------------|
| Backend (NestJS)    | JWT Authentication | Génération et validation des tokens |
| Backend (NestJS)    | Passport JWT      | Stratégie d'authentification       |
| Backend (NestJS)    | Bcrypt            | Hashage des mots de passe          |
| Mobile (React Native) | Redux Toolkit   | Gestion de l'état de session       |

### 14.9 Sécurité

- Hashage systématique des mots de passe (Bcrypt)
- Expiration automatique des tokens JWT
- Gestion de la déconnexion forcée
- Limitation des accès selon le rôle
- Aucune donnée sensible stockée côté client

---

## 15. Fonctionnalités Détaillées

### Gestion des Menus
- Création et modification des plats
- Gestion des prix et disponibilités
- Catégorisation des plats
- Upload des images des plats

### Gestion des Tables
- Création et numérotation des tables
- Affectation des serveurs
- Suivi du statut des tables
- Génération automatique des QR Codes

### Gestion des Commandes
- Réception des commandes en temps réel
- Validation par le serveur
- Routage automatique (cuisine/bar)
- Suivi des statuts de préparation

### Gestion de la Cuisine
- La cuisine reçoit les plats à préparer
- Les cuisiniers changent le statut des commandes
- Notification lorsque les plats sont prêts

### Gestion du Bar
- Le bar reçoit uniquement les boissons
- Suivi des boissons en préparation
- Notification lorsque les boissons sont prêtes

### Gestion des Paiements
- Paiement Mobile Money
- Paiement espèces
- Paiement carte bancaire
- Gestion des factures

### Gestion des Statistiques
- Statistiques des ventes
- Plats les plus vendus
- Performance des serveurs
- Heures d'affluence

### Gestion des Rôles
- Administrateur
- Manager
- Serveur
- Cuisine
- Bar
- Caissier

### Gestion Temps Réel
- Mise à jour instantanée des commandes
- Notifications en direct
- Communication temps réel entre les interfaces

### Fonctionnalités Futures
- Système de fidélité client
- Intelligence artificielle
- Livraison
- Réservation en ligne
- Analyse intelligente des ventes

---

## 16. Explication du Fonctionnement Temps Réel

Le système utilise **Socket.IO** pour la communication temps réel.

- Lorsqu'un client commande, le serveur reçoit immédiatement une notification
- Lorsque le serveur valide la commande, le client reçoit une confirmation
- La cuisine reçoit automatiquement les plats à préparer
- Le bar reçoit automatiquement les boissons
- Le système met à jour automatiquement les statuts

---

## 17. Conclusion Générale

Cette application représente une solution moderne et intelligente de gestion de restaurant. Elle permet d'améliorer l'organisation, la rapidité du service et l'expérience client grâce aux QR Codes, au temps réel et à l'automatisation des processus.

Le système intègre désormais une gestion complète des connexions et des authentifications, garantissant la sécurité des accès tout en offrant une expérience fluide pour les clients et les employés.

---

*Cahier des Charges — Application Restaurant QR Code — Version 1.0 — 2025*
