# CAHIER DES CHARGES
## Application Mobile de Gestion de Restaurant avec Système QR Code

> Solution digitale complète pour la modernisation de la restauration

**Version 3.0 — Mai 2026**

---

## 1. Objectifs du Projet

- Digitaliser les menus via QR Code
- Commandes sur place, à emporter et en ligne
- Gestion des tables et serveurs avec affectation automatique
- Notifications temps réel avec son et vibration
- Suivi des commandes article par article
- Transition automatique des statuts
- Caisse avec clôture caissier et clôture globale
- Statistiques avec filtres par période
- Restauration de session client

---

## 2. Fonctionnement Général

### 2.1 Sur place
Client scanne QR → Menu → Commande (EN_ATTENTE) → Serveur valide → Cuisine/Bar préparent → Prêt → Servi → Payé

### 2.2 À emporter (Comptoir)
Client scanne QR T00 → Menu → Commande (auto-validée) → CMD-XXXX → Cuisine/Bar → Prêt → Client donne CMD → Caissier paye

### 2.3 Cycle de vie
```
EN_ATTENTE → VALIDEE → EN_PREPARATION → PRETE(auto) → SERVIE → PAYEE
```

---

## 3. Modules

### 3.1 Commandes
- Création client sans auth (sessionKey)
- Annulation article/commande avant validation
- Suivi deux niveaux : commande + détails article
- Auto-validation pour commandes comptoir (T00/zone Comptoir)
- Transition automatique PRETE quand tous articles prêts
- Demande d'addition par le client
- Recherche par CMD-XXXX pour la caisse

### 3.2 Dashboards par rôle
- **Cuisine** : FIFO avec timer, code couleur, "Tout prêt" par table
- **Bar** : identique cuisine, montants filtrés par destination
- **Caissier** : caisse personnelle, recherche CMD, clôture
- **Serveur** : ses tables et commandes uniquement
- **Admin/Manager** : vue complète, clôture globale

### 3.3 Paiements et Caisse
- 3 modes : Espèces, Mobile Money, Carte Bancaire
- Facture automatique avec réimpression
- **Clôture caissier** : transactions personnelles, remplaçant à zéro
- **Clôture globale** : fermeture restaurant, réouverture automatique

### 3.4 Planning
- Obligatoire : SERVEUR, CUISINE, BAR, CAISSIER
- Non requis : ADMIN, MANAGER
- Filtres par rôle et agent (listes déroulantes)
- Affectation automatique quotidienne des tables

### 3.5 Statistiques
- Filtre par intervalle de date (défaut : aujourd'hui)
- CA, commandes, panier moyen
- Top plats, performance serveurs, performance caissiers
- Affluence horaire
- Blocs cliquables avec modales de détail

### 3.6 Notifications
- Toasts 3D avec ombres et bordures
- Sonnerie (bip WAV) à chaque événement
- Vibration sur mobile
- Socket.IO temps réel

### 3.7 Interface Client Web
- Menu responsive, panier, confirmation
- Historique temps réel (Socket.IO)
- Annulation article/commande
- Demande d'addition
- Restauration automatique de session (localStorage + fallback)
- Affichage numéro CMD pour comptoir
- **Restaurant fermé** : message rouge avec date/heure de réouverture, menu masqué

---

## 4. Technologies

| Composant | Technologie |
|---|---|
| Frontend Mobile | React Native (Expo) |
| Interface Client | HTML/JS vanilla + Socket.IO |
| Backend | NestJS 10 |
| Base de données | MySQL 8 |
| ORM | Prisma 4 |
| Temps réel | Socket.IO 4 |
| Audio/Vibration | expo-av + Vibration API |
| Authentification | JWT + Passport + Bcrypt |
| QR Codes | qrcode (npm) |

---

## 5. Base de Données

### Tables principales
- **Restaurant** : nom, adresse, devise, telephone, statut (OUVERT/FERME), dateReouverture
- **Utilisateur** : nom, telephone, mot_de_passe, role, statut, photo
- **TableRestaurant** : numero, zone, statut, serveur_id, qr_code
- **CategorieMenu** : nom, ordre, destination (BAR/CUISINE/DESSERT)
- **Menu** : nom, prix, image, temps_preparation, disponibilite
- **SessionClient** : session_key, table_id, date_arrivee, statut
- **Commande** : statut, montant, typeCommande (SUR_PLACE/A_EMPORTER), modePaiement, clientRef
- **CommandeDetail** : article, quantite, prix, statutPreparation
- **Facture** : numero, montant, modePaiement, date
- **Notification** : utilisateur, message, lu
- **Planning** : utilisateur, jour, heureDebut, heureFin, statut
- **ServeurTable** : utilisateur, table, dateAffectation
- **ClotureCaisse** : caissier, totaux par mode, type (CAISSIER/GLOBAL)

### Enums
- **Role** : ADMIN, MANAGER, SERVEUR, CUISINE, BAR, CAISSIER
- **StatutCommande** : EN_ATTENTE, VALIDEE, EN_PREPARATION, PRETE, SERVIE, PAYEE, ANNULEE
- **TypeCommande** : SUR_PLACE, A_EMPORTER
- **TypeCloture** : CAISSIER, GLOBAL
- **StatutRestaurant** : OUVERT, FERME
- **Destination** : BAR, CUISINE, DESSERT

---

## 6. Règles métier

| Règle | Détail |
|---|---|
| Planning obligatoire | SERVEUR, CUISINE, BAR, CAISSIER (pas ADMIN, MANAGER) |
| Auto-validation comptoir | Commandes zone Comptoir ou T00 → VALIDEE direct |
| Auto-PRETE | Dès que tous les articles (cuisine + bar) sont PRET |
| Libération table | Après paiement si 0 commande active (EN_ATTENTE ignorées) |
| Clôture caissier | Chaque caissier voit ses transactions depuis sa dernière clôture |
| Clôture globale | Restaurant FERME, réouverture automatique à l'heure prévue |
| Session client | localStorage (< 6h) + fallback table (session aujourd'hui) |
| Annulation client | Uniquement si EN_ATTENTE, par article ou commande entière |
| Impression reçu | URL avec token JWT en query param |

---

## 7. Sécurité

- JWT 12h + Bcrypt 10 rounds
- Double vérification : statut ACTIF + planning
- SessionKey pour propriété des commandes client
- Guards par rôle sur chaque endpoint
- Token JWT dans l'URL pour impression reçu

---

*Cahier des Charges — Version 3.0 — Mai 2026*
