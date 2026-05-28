# CAHIER DES CHARGES
## Application Mobile de Gestion de Restaurant avec Système QR Code

> Solution digitale complète pour la modernisation de la restauration

**Version 3.0 — Mai 2026**

---

## Table des matières

1. [Objectifs du Projet](#1-objectifs-du-projet)
2. [Fonctionnement Général](#2-fonctionnement-général)
3. [Cycle de Vie d'une Commande](#3-cycle-de-vie-dune-commande)
4. [Gestion des Tables et Serveurs](#4-gestion-des-tables-et-serveurs)
5. [Gestion des Notifications](#5-gestion-des-notifications)
6. [Technologies](#6-technologies)
7. [Structure de la Base de Données](#7-structure-de-la-base-de-données)
8. [Interfaces des Acteurs](#8-interfaces-des-différents-acteurs)
9. [Gestion du Planning et Affectation](#9-gestion-du-planning-et-affectation)
10. [Authentification et Sécurité](#10-authentification-et-sécurité)
11. [Routes API](#11-routes-api)
12. [Fonctionnalités Détaillées](#12-fonctionnalités-détaillées)

---

## 1. Objectifs du Projet

- Digitaliser les menus des restaurants
- Permettre aux clients de commander via QR Code
- Gérer les tables et les serveurs
- Notifier les serveurs, la cuisine et le bar en temps réel avec **son**
- Suivi des commandes article par article
- Automatiser la transition des statuts
- Améliorer l'expérience client (restauration de session, annulation)

---

## 2. Fonctionnement Général

1. Le client scanne le QR Code → page web avec le menu
2. Le système crée ou restaure une session (localStorage + fallback table)
3. Le client commande → EN_ATTENTE (annulable)
4. Le serveur valide → VALIDEE (table → OCCUPEE)
5. Cuisine/bar préparent → EN_PREPARATION
6. Chaque article marqué prêt → quand tous prêts → PRETE (automatique)
7. Le serveur sert → SERVIE (bouton addition visible)
8. Le caissier encaisse → PAYEE (table → LIBRE)

---

## 3. Cycle de Vie d'une Commande

```
EN_ATTENTE ──[Serveur]──▶ VALIDEE ──[Cuisine/Bar]──▶ EN_PREPARATION
     │                                                      │
     │ [Client peut annuler]                                 │ [Articles → PRET]
     │                                                      │ [Tous PRET → auto]
     ▼                                                      ▼
  ANNULEE                                                PRETE
                                                    │
                                           [Serveur] │
                                                    ▼
                                                  SERVIE
                                                    │
                                         [Caissier]  │
                                                    ▼
                                                  PAYEE
```

### Règles métier

| Transition | Qui | Condition |
|---|---|---|
| EN_ATTENTE → VALIDEE | Serveur | - |
| EN_ATTENTE → ANNULEE | Client | Via API avec sessionKey |
| Article → PRET | Cuisine/Bar | Unitaire ou "Tout prêt" |
| Commande → PRETE | **Automatique** | Tous les articles PRET |
| PRETE → SERVIE | Serveur | - |
| SERVIE → PAYEE | Caissier | - |
| Table → LIBRE | **Automatique** | Après paiement, si 0 commande active (hors EN_ATTENTE) |

---

## 4. Gestion des Tables et Serveurs

- Chaque table a un QR code unique
- Une table est assignée à un serveur
- Transfert possible en cas d'absence
- Affectation quotidienne automatique selon planning
- Libération automatique après paiement (EN_ATTENTE ignorées)

---

## 5. Gestion des Notifications

### Canaux

| Canal | Technologie | Usage |
|---|---|---|
| **Toasts visuels** | react-native-toast-message | Interface mobile |
| **Son** | expo-av (WAV) | Bip à chaque événement |
| **Socket.IO** | socket.io | Temps réel |

### Toasts 3D

Design moderne avec ombres prononcées, coins arrondis, bande colorée par type (succès/erreur/info).

### Événements

| Événement | Room | Son |
|---|---|---|
| `nouvelle_commande` | `serveur:{id}` | 🔊 |
| `nouvelle_commande_cuisine` | `cuisine` | 🔊 |
| `nouvelle_commande_bar` | `bar` | 🔊 |
| `commande_status_change` | `serveur:{id}`, `admin` | 🔊 |
| `demande_facture` | `serveur:{id}`, `admin` | 🔊 |
| `notification_user` | `serveur:{id}` | 🔊 |
| `notification_admin` | `admin` | 🔊 |
| `commande_status` | `table:{id}` (client web) | - |

---

## 6. Technologies

| Composant | Technologie |
|---|---|
| Frontend Mobile | React Native (Expo) |
| Interface Client | HTML/JS vanilla + Socket.IO |
| Backend | NestJS 10 |
| Base de données | MySQL 8 |
| ORM | Prisma 4 |
| Temps réel | Socket.IO 4 |
| Authentification | JWT + Passport + Bcrypt |
| Audio | expo-av |

---

## 7. Structure de la Base de Données

### 7.1 Modèles principaux

**Restaurant** : id, nom, adresse, devise, telephone

**Utilisateur** : id, nom, telephone (unique), mot_de_passe (hashé), role (ADMIN/MANAGER/SERVEUR/CUISINE/BAR/CAISSIER), statut (ACTIF/INACTIF/CONGE/SUSPENDU), photo, restaurant_id

**TableRestaurant** : id, numero, zone, statut (LIBRE/OCCUPEE/RESERVEE), serveur_id, qr_code, restaurant_id

**CategorieMenu** : id, nom, ordre_service, destination (BAR/CUISINE/DESSERT), restaurant_id

**Menu** : id, nom, prix, image, categorie_id, temps_preparation, disponibilite, restaurant_id

**SessionClient** : id, session_key (unique), table_id, date_arrivee, statut (ACTIVE/TERMINEE), utilisateur_id

**Commande** : id, table_id, serveur_id, session_id, statut (EN_ATTENTE/VALIDEE/EN_PREPARATION/PRETE/SERVIE/PAYEE/ANNULEE), montant_total, date_commande, mode_paiement, statut_paiement, date_paiement, caissier_id, client_ref

**CommandeDetail** : id, commande_id, menu_id, quantite, prix, statut_preparation (EN_PREPARATION/PRET)

**Facture** : id, numero (unique), commande_id, montant_total, mode_paiement, date_facture, caissier_id

**Notification** : id, utilisateur_id, message, lu, date_notification

**Planning** : id, utilisateur_id, jour, heure_debut, heure_fin, statut

**ServeurTable** : id, utilisateur_id, table_id, date_affectation, statut

---

## 8. Interfaces des Différents Acteurs

### Dashboard Cuisine (dédié)
- Stats : à préparer / en cours / prêtes
- Files d'attente FIFO triées par ancienneté
- Code couleur : 🔴 >15min / 🟡 5-15min / 🟢 <5min
- Timer ⏱ par table
- Actions : "En préparation" (commande), "Prêt" (article), "Tout prêt" (table)
- Montants : total cuisine uniquement

### Dashboard Bar (dédié)
- Même structure que la cuisine
- Montants : total bar uniquement

### Dashboard Caissier
- Caisse du jour avec total général et détail par mode
- Commandes à payer groupées par table
- Historique factures avec réimpression (🖨)
- Clôture de caisse

### Dashboard Serveur
- Stats globales du jour
- Mes tables et commandes
- Navigation rapide

### Dashboard Admin/Manager
- Vue complète avec toutes les stats
- Contrôle manuel total

### Interface Client (Web)
- Menu responsive par catégories
- Panier, confirmation, historique temps réel
- Annulation article/commande (si EN_ATTENTE)
- Demande d'addition (si SERVIE)
- Restauration automatique de session

---

## 9. Gestion du Planning et Affectation

- Planning par jour et par heure
- Vérification à la connexion (serveur sans planning = refusé)
- Affectation quotidienne automatique (`POST /api/serveur-tables/run-check`)
- Transfert de tables entre serveurs (unitaire ou global)
- Rôles sans planning requis : ADMIN, MANAGER, CUISINE, BAR, CAISSIER

---

## 10. Authentification et Sécurité

| Aspect | Détail |
|---|---|
| Login | Téléphone + mot de passe |
| Hashage | Bcrypt (10 rounds) |
| Token | JWT (12h) |
| Double vérification | Statut ACTIF + Planning (serveur) |
| Session client | Clé unique, pas d'auth |
| Vérification actions client | sessionKey |
| Reçu imprimable | Token JWT dans l'URL |

---

## 11. Routes API

Préfixe : `/api` (sauf routes client)

### Auth — `/api/auth`
| Méthode | Route | Accès |
|---|---|---|
| POST | /login | Public |
| POST | /register | Public |
| GET | /profile | JWT |
| PATCH | /profile | JWT |
| POST | /photo | JWT |
| PATCH | /password | JWT |
| POST | /forgot-password | Public |

### Commandes — `/api/commandes`
| Méthode | Route | Accès |
|---|---|---|
| POST | /client | Public |
| POST | /client-annuler | Public |
| POST | /client-annuler-detail | Public |
| POST | /demande-facture | Public |
| GET | /client-session/:key | Public |
| GET | /table-public/:id | Public |
| GET | / | ADMIN, MANAGER |
| GET | /serveur | ADMIN, MANAGER, SERVEUR |
| GET | /cuisine | CUISINE |
| GET | /bar | BAR |
| GET | /table/:id | ADMIN, MANAGER, SERVEUR |
| GET | /stats | JWT |
| PATCH | /:id/statut | ADMIN, MANAGER, SERVEUR, CUISINE, BAR |
| PATCH | /details/:id/statut | CUISINE, BAR |
| POST | /tout-pret | CUISINE, BAR |

### Paiements — `/api/paiements`
| Méthode | Route | Accès |
|---|---|---|
| GET | /a-payer | ADMIN, MANAGER, CAISSIER |
| POST | /payer/:id | ADMIN, MANAGER, CAISSIER |
| GET | /factures | ADMIN, MANAGER, CAISSIER |
| GET | /factures/:id | ADMIN, MANAGER, CAISSIER |
| GET | /factures/:id/imprimer | Public (+token) |
| GET | /caisse/jour | ADMIN, MANAGER, CAISSIER |
| POST | /caisse/cloture | ADMIN, MANAGER, CAISSIER |

### Autres modules
Voir [DOCUMENTATION.md](./DOCUMENTATION.md) pour les routes Users, Tables, Menu, Planning, Serveur-Tables, Notifications, Statistiques, Restaurant.

---

## 12. Fonctionnalités Détaillées

### Gestion des Menus
- CRUD plats et catégories
- Upload images (JPEG, PNG, WEBP)
- Activation/désactivation
- Destination par catégorie (CUISINE, BAR, DESSERT)

### Gestion des Tables
- CRUD avec QR code automatique
- Assignation serveur, statut, zone

### Gestion des Commandes
- Création client sans auth (sessionKey)
- Annulation client (article ou commande) avant validation
- Suivi à deux niveaux : commande + détails
- Routage automatique cuisine/bar
- Transition automatique PRETE quand tous les articles prêts
- Demande d'addition par le client

### Dashboard Cuisine/Bar
- Interface dédiée FIFO avec timer et code couleur
- Actions par article et par table ("Tout prêt")
- Montants filtrés par destination

### Gestion des Paiements
- 3 modes : Espèces, Mobile Money, Carte Bancaire
- Facture automatique avec numéro unique
- Réimpression depuis l'historique
- Clôture de caisse journalière

### Notifications
- Temps réel via Socket.IO
- Toasts 3D design moderne
- Sonnerie à chaque événement
- Persistance en base de données

### Restauration de Session Client
- localStorage (navigateur) : sessionKey sauvegardée, vérification fraîcheur < 6h
- Fallback table : commandes actives du jour
- Nettoyage automatique

---

*Cahier des Charges — Version 3.0 — Mai 2026*
