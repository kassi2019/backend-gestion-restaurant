# RestoPro — Documentation Complète

## Parcours Client : De l'Entrée à la Sortie

---

## 1. ARRIVÉE DU CLIENT

### 1.1 Le client scanne le QR Code de la table

Chaque table possède un QR code unique. Le client le scanne avec son téléphone et arrive sur la page :

```
http://<IP_DU_SERVEUR>:3000/client.html?tableId=3&restaurantId=1
```

**Ce qui s'affiche :**
- Le nom du restaurant (ex: "RestoPro Demo")
- Le numéro de table (ex: "Table 3")
- Le menu complet (catégories : Entrées, Plats, Boissons, Desserts)
- Les prix dans la devise du restaurant (€, FCFA, $...)

### 1.2 Plusieurs personnes à la même table

Chaque personne qui scanne le QR code reçoit un `clientRef` unique (ex: `CLI-A7B2`, `CLI-X9K1`), généré côté client (mobile/web). Le backend génère également une `sessionKey` unique (format `TB{idTable}-{timestamp}`).

> **Exemple** : Table 5, 4 personnes. Chacune scanne le QR code.
> - Personne 1 → clientRef CLI-A7B2
> - Personne 2 → clientRef CLI-B3M8
> - Personne 3 → clientRef CLI-K2P4
> - Personne 4 → clientRef CLI-Z1W6
>
> Elles commandent **indépendamment** mais tout est lié à la **Table 5**.

---

## 2. COMMANDE PAR LE CLIENT

### 2.1 Le client compose sa commande

Le client :
1. Parcourt les catégories (Entrées, Plats, Boissons...)
2. Appuie sur **+** pour ajouter un plat
3. Le panier se remplit en bas de l'écran

> **Exemple** : CLI-A7B2 commande :
> - 2x Poulet DG (15.00 € = 30.00 €)
> - 1x Jus d'orange (5.00 € = 5.00 €)
> - **Total panier : 35.00 €**

### 2.2 Le client confirme

Le client appuie sur **Commander** puis **Confirmer la commande**.

**Endpoint** : `POST /api/commandes/client`

```json
{
  "tableId": 3,
  "sessionKey": "TB3-XXX",
  "clientRef": "CLI-A7B2",
  "articles": [
    { "menuId": 5, "quantite": 2 },
    { "menuId": 2, "quantite": 1 }
  ]
}
```

**Ce qui se passe côté backend :**
1. Une **session** est créée (ou réutilisée via `sessionKey`) pour cette table
2. La commande est créée avec le statut **EN_ATTENTE**
3. Une notification temps réel est envoyée au **serveur** assigné à cette table
4. Si les articles contiennent des plats CUISINE/DESSERT → notification à l'écran **Cuisine**
5. Si les articles contiennent des boissons BAR → notification à l'écran **Bar**
6. Une notification est sauvegardée en base de données

**Ce que voit le client :**
```
Commande envoyée !
Votre commande a été transmise au serveur.
35.00 €
Le serveur va valider votre commande.
```

---

## 3. TRAITEMENT PAR LE SERVEUR

### 3.1 Le serveur voit les commandes en attente

Le serveur ouvre l'onglet **Commandes** sur son téléphone/tablette.

**Endpoint** : `GET /api/commandes/serveur` — Renvoie uniquement les commandes du serveur connecté.

### 3.2 Le serveur valide la commande

Le serveur appuie sur **Valider**.

**Endpoint** : `PATCH /api/commandes/:id/statut` avec `{ "statut": "VALIDEE" }`

**Ce qui se passe :**
1. La commande passe de `EN_ATTENTE` → `VALIDEE`
2. **La table passe automatiquement à OCCUPEE** (si elle ne l'était pas déjà)
3. Un toast temps réel s'affiche pour le serveur et les admins
4. Les notifications cuisine/bar sont déclenchées selon le contenu de la commande

### 3.3 Le cycle de vie de la commande

```
EN_ATTENTE  →  Le client a envoyé sa commande
    │
    ▼ [Serveur : Valider]
VALIDEE     →  Le serveur a confirmé, la table → OCCUPEE
    │
    ▼ [Cuisine : En préparation]
EN_PREPARATION → Les cuisiniers préparent
    │
    ▼ [Cuisine : Prête]
PRETE       →  Le plat est prêt à être servi
    │
    ▼ [Serveur : Servie]
SERVIE      →  Le plat est servi au client
    │
    ▼ [Caissier : Payer]
PAYEE       →  Le client a payé

ANNULEE     →  Commande annulée (possible depuis la validation)
```

**Actions disponibles selon le statut :**

| Statut | Qui peut agir | Endpoint |
|---|---|---|
| EN_ATTENTE | Serveur | `PATCH /api/commandes/:id/statut` → VALIDEE |
| VALIDEE | Cuisine, Bar | `PATCH /api/commandes/:id/statut` → EN_PREPARATION |
| EN_PREPARATION | Cuisine | `PATCH /api/commandes/details/:id/statut` → PRET |
| PRETE | Serveur | `PATCH /api/commandes/:id/statut` → SERVIE |
| SERVIE | Caissier | `POST /api/paiements/payer/:commandeId` → PAYEE |

### 3.4 Statut des détails de commande

Chaque ligne de commande (`CommandeDetail`) a son propre suivi de préparation :

| Statut | Description |
|---|---|
| EN_PREPARATION | Par défaut à la création |
| PRET | Le plat/boisson est prêt |

**Endpoint dédié** : `PATCH /api/commandes/details/:id/statut` avec `{ "statut": "PRET" }`
Accessible aux rôles CUISINE et BAR pour gérer la préparation article par article.

---

## 4. TRAITEMENT PAR LA CUISINE ET LE BAR

### 4.1 La cuisine reçoit les commandes en temps réel

Quand un client passe commande avec des plats de destination **CUISINE** ou **DESSERT**, un toast s'affiche immédiatement sur l'écran cuisine.

**Endpoint** : `GET /api/commandes/cuisine` — Filtré automatiquement : plats CUISINE + DESSERT, exclut EN_ATTENTE/ANNULEE/PAYEE/SERVIE.

### 4.2 Le cuisinier change le statut

Le cuisinier peut :
1. Passer la commande entière en `EN_PREPARATION` : `PATCH /api/commandes/:id/statut`
2. Passer un détail spécifique en `PRET` : `PATCH /api/commandes/details/:id/statut`

### 4.3 Le bar fonctionne de la même façon

**Endpoint** : `GET /api/commandes/bar` — Filtré automatiquement : boissons BAR uniquement.

---

## 5. PAIEMENT PAR LE CAISSIER

### 5.1 Le caissier voit les commandes à payer

**Endpoint** : `GET /api/paiements/a-payer` — Commandes SERVIE non encore payées.

### 5.2 Le caissier encaisse

**Endpoint** : `POST /api/paiements/payer/:commandeId` avec `{ "mode": "ESPECES" }`

**Ce qui se passe :**
1. La commande passe à `PAYEE`
2. Une **facture** est générée (ex: `FAC-20260528-0003`)
3. **Vérification** : reste-t-il d'autres commandes non payées sur cette table ?
   - **OUI** → la table reste `OCCUPEE`
   - **NON** → la table passe à `LIBRE`

**Modes de paiement disponibles :**
- `ESPECES`
- `MOBILE_MONEY`
- `CARTE_BANCAIRE`

### 5.3 Factures

| Endpoint | Description |
|---|---|
| `GET /api/paiements/factures` | Liste des factures (filtrable par `?date=YYYY-MM-DD`) |
| `GET /api/paiements/factures/:id` | Détail d'une facture |
| `GET /api/paiements/factures/:id/imprimer` | Version HTML imprimable |

### 5.4 Caisse journalière

| Endpoint | Description |
|---|---|
| `GET /api/paiements/caisse/jour` | Résumé des encaissements du jour par mode de paiement |
| `POST /api/paiements/caisse/cloture` | Clôture de la caisse du jour |

---

## 6. GESTION DES TABLES ET SERVEURS

### 6.1 Affectation des tables aux serveurs

L'admin/manager peut affecter des tables aux serveurs.

| Endpoint | Description |
|---|---|
| `GET /api/serveur-tables` | Toutes les affectations |
| `GET /api/serveur-tables/serveur` | Affectations du serveur connecté |
| `GET /api/serveur-tables/table/:tableId` | Affectation d'une table spécifique |
| `POST /api/serveur-tables` | Assigner une table à un serveur |
| `POST /api/serveur-tables/bulk` | Assigner plusieurs tables d'un coup |
| `DELETE /api/serveur-tables/:tableId` | Désassigner une table |
| `PATCH /api/serveur-tables/reassign` | Transférer des tables d'un serveur à un autre |

### 6.2 Transfert en cas d'absence

**Endpoint** : `PATCH /api/serveur-tables/reassign`

```json
{
  "fromServeurId": 2,
  "toServeurId": 3,
  "tableId": 5
}
```

Si `tableId` n'est pas fourni, **toutes** les tables du serveur source sont transférées au serveur cible.

### 6.3 Affectation quotidienne automatique

**Endpoint** : `POST /api/serveur-tables/run-check`

**Ce qui se passe :**
1. Le système vérifie le **planning** du jour
2. Les serveurs **absents** sont désactivés, leurs tables libérées
3. Les serveurs **présents** sont activés
4. Les tables libres sont **redistribuées** équitablement aux serveurs actifs

### 6.4 Le serveur voit uniquement ses tables

**Endpoint** : `GET /api/tables/serveur` — Renvoie les tables assignées au serveur connecté.

### 6.5 Endpoints de gestion des tables

| Endpoint | Accès | Description |
|---|---|---|
| `GET /api/tables` | ADMIN, MANAGER, SERVEUR | Toutes les tables du restaurant |
| `GET /api/tables/serveur` | ADMIN, MANAGER, SERVEUR | Tables du serveur connecté |
| `POST /api/tables` | ADMIN, MANAGER | Créer une table |
| `PATCH /api/tables/:id` | ADMIN, MANAGER | Modifier une table |
| `DELETE /api/tables/:id` | ADMIN, MANAGER | Supprimer une table |
| `PATCH /api/tables/:id/assign` | ADMIN, MANAGER | Assigner un serveur à la table |
| `PATCH /api/tables/:id/statut` | ADMIN, MANAGER, SERVEUR | Changer le statut de la table |
| `GET /api/tables/:id/qrcode` | ADMIN, MANAGER, SERVEUR | Données QR code de la table |

---

## 7. NOTIFICATIONS EN TEMPS RÉEL

### 7.1 Toasts sur l'écran

Dès qu'un événement se produit, un toast s'affiche sur le téléphone des personnes concernées.

| Événement | Événement Socket | Qui reçoit |
|---|---|---|
| Nouvelle commande client | `nouvelle_commande` | Serveur assigné |
| Nouvelle commande cuisine | `nouvelle_commande_cuisine` | Salle `cuisine` |
| Nouvelle commande bar | `nouvelle_commande_bar` | Salle `bar` |
| Changement de statut | `commande_status_change` | Serveur + salle `admin` |
| Notification utilisateur | `notification_user` | Utilisateur spécifique |
| Notification admin | `notification_admin` | Salle `admin` |

### 7.2 Centre de notifications

| Endpoint | Description |
|---|---|
| `GET /api/notifications` | Notifications de l'utilisateur connecté (filtrable par `?date=YYYY-MM-DD`) |
| `PATCH /api/notifications/:id/read` | Marquer une notification comme lue |
| `PATCH /api/notifications/read-all` | Marquer toutes les notifications comme lues |

### 7.3 Enregistrement Socket.IO

Les clients mobiles s'enregistrent via l'événement `register` :

```json
{ "userId": "2", "role": "SERVEUR" }
```

**Rooms par rôle :**
- `serveur:{userId}` — Chaque serveur a sa room individuelle
- `cuisine` — Tous les cuisiniers
- `bar` — Tous les barmen
- `admin` — Admins et managers
- `table:{tableId}` — Room client pour suivi de commande (événement `joinTable`)

---

## 8. EXEMPLES DE SCÉNARIOS COMPLETS

### Scénario A : Un couple au restaurant

```
19:00  Table 2 LIBRE
       → M. Dupont scanne le QR code (clientRef=CLI-DP01)
       → Mme Dupont scanne le QR code (clientRef=CLI-DP02)

19:05  CLI-DP01 commande : 1x Entrée (10€) + 1x Plat (20€) = 30€
       CLI-DP02 commande : 1x Plat (18€) + 1x Dessert (8€) = 26€
       → 2 commandes EN_ATTENTE dans la même Table 2
       → Toast sur le tel du serveur : "Nouvelle commande • Table 2"
       → Toast sur l'écran cuisine : "Nouvelle commande • Table 2"

19:06  Serveur valide les 2 commandes
       → Table 2 → OCCUPEE
       → Toast : "Table 2 → validée"

19:06  Cuisine voit les plats, les passe en préparation puis prêts
       → Toast sur le tel du serveur : "Table 2 → prête"

19:30  Serveur sert les plats → SERVIE

20:00  Les clients demandent l'addition
       → Caissier : 30€ + 26€ = 56€ en Espèces
       → Les 2 commandes → PAYEE
       → Toast admin : "Paiement reçu table 2 — 56.00 €"
       → Vérification : 0 commande active → Table 2 → LIBRE
```

### Scénario B : Transfert de tables (serveur absent)

```
08:00  Planning du jour : Jean, Marie, Paul sont programmés
       → Check automatique : tables réparties

10:00  Jean appelle : il est malade
       → Manager utilise PATCH /api/serveur-tables/reassign
       → fromServeurId: Jean, toServeurId: Marie
       → Toutes les tables de Jean → Marie
```

### Scénario C : Table réservée

```
10:00  Le gérant réserve la Table 8 via PATCH /api/tables/8/statut
       → Table 8 → RESERVEE

19:00  Le client arrive, scanne le QR code et commande
       → Commande EN_ATTENTE (la table reste RESERVEE)

19:05  Le serveur valide
       → Table 8 → OCCUPEE (écrase le statut RESERVEE)

21:00  Paiement → Table 8 → LIBRE
```

---

## 9. TABLEAU DE BORD (DASHBOARD)

### Pour l'Admin/Manager

**Endpoint** : `GET /api/statistiques/dashboard`

Statistiques du jour (commandes par statut, nombre de tables, total commandes).

### Pour le Serveur

**Endpoint** : `GET /api/commandes/stats` — Le serveur voit **uniquement ses propres commandes** du jour (filtré automatiquement par `serveurId`).

### Pour la Cuisine/Bar

Même endpoint `GET /api/commandes/stats` — Voient les stats globales du restaurant.

### Statistiques avancées (ADMIN, MANAGER)

| Endpoint | Description |
|---|---|
| `GET /api/statistiques/dashboard` | Vue d'ensemble |
| `GET /api/statistiques/ventes` | CA par jour (filtrable `?debut=&fin=`) |
| `GET /api/statistiques/plats-populaires` | Top plats (`?limit=10`) |
| `GET /api/statistiques/performance-serveurs` | Performance par serveur |
| `GET /api/statistiques/affluence` | Affluence par heure |

---

## 10. GESTION DES UTILISATEURS

### Authentification

| Endpoint | Accès | Description |
|---|---|---|
| `POST /api/auth/login` | Public | Connexion (téléphone + mot de passe) |
| `POST /api/auth/register` | Public | Inscription |
| `GET /api/auth/profile` | JWT | Profil utilisateur connecté |
| `PATCH /api/auth/profile` | JWT | Modifier nom/photo |
| `POST /api/auth/photo` | JWT | Upload photo de profil |
| `PATCH /api/auth/password` | JWT | Changer mot de passe |
| `POST /api/auth/forgot-password` | Public | Réinitialiser mot de passe |

### Vérification planning à la connexion

Lors du login, le système vérifie le planning du jour pour les rôles concernés :
- **SERVEUR** : Un planning ACTIF aujourd'hui est obligatoire pour se connecter
- **ADMIN, MANAGER, CUISINE, BAR, CAISSIER** : Pas de vérification planning

### CRUD Utilisateurs (ADMIN, MANAGER)

| Endpoint | Description |
|---|---|
| `GET /api/users` | Tous les utilisateurs du restaurant |
| `GET /api/users/role/:role` | Filtrer par rôle |
| `PATCH /api/users/:id` | Modifier un utilisateur |
| `PATCH /api/users/:id/statut?statut=ACTIF` | Changer le statut |

---

## 11. GESTION DU MENU

| Endpoint | Accès | Description |
|---|---|---|
| `GET /api/menu/public/:restaurantId` | Public | Menu complet par catégories |
| `GET /api/menu` | ADMIN, MANAGER | Tous les articles |
| `POST /api/menu` | ADMIN, MANAGER | Créer un article |
| `PATCH /api/menu/:id` | ADMIN, MANAGER | Modifier un article |
| `DELETE /api/menu/:id` | ADMIN, MANAGER | Supprimer un article |
| `PATCH /api/menu/:id/toggle` | ADMIN, MANAGER | Activer/désactiver un article |
| `POST /api/menu/:id/image` | ADMIN, MANAGER | Upload image (JPEG, PNG, WEBP) |
| `GET /api/menu/categories` | ADMIN, MANAGER | Liste des catégories |
| `POST /api/menu/categories` | ADMIN, MANAGER | Créer une catégorie |

---

## 12. GESTION DU PLANNING

| Endpoint | Accès | Description |
|---|---|---|
| `GET /api/planning` | ADMIN, MANAGER | Tous les plannings |
| `POST /api/planning` | ADMIN, MANAGER | Créer une entrée |
| `GET /api/planning/mine` | JWT | Planning de l'utilisateur connecté |
| `GET /api/planning/date/:date` | ADMIN, MANAGER | Planning d'une date spécifique |
| `PATCH /api/planning/:id` | ADMIN, MANAGER | Modifier une entrée |
| `DELETE /api/planning/:id` | ADMIN, MANAGER | Supprimer une entrée |

---

## 13. RÉSUMÉ DES ÉTATS

### Statuts de table
```
LIBRE     → Aucun client, disponible
OCCUPEE   → Client(s) présent(s), commande validée
RESERVEE  → Réservée pour plus tard
```

### Statuts de commande
```
EN_ATTENTE     → Client a envoyé, en attente de validation
VALIDEE        → Serveur a confirmé
EN_PREPARATION → En cours de préparation en cuisine/bar
PRETE          → Prêt à être servi
SERVIE         → Servi au client
PAYEE          → Payé, facture générée
ANNULEE        → Annulée
```

### Statuts de préparation (détails)
```
EN_PREPARATION → Par défaut, en attente de préparation
PRET           → Prêt
```

### Statuts de paiement
```
NON_PAYEE  → Pas encore payé
PAYEE      → Payé
REMBOURSEE → Remboursé
```

### Modes de paiement
```
ESPECES        → En espèces
MOBILE_MONEY   → Mobile Money
CARTE_BANCAIRE → Carte bancaire
```

---

## 14. RÔLES UTILISATEURS

| Rôle | Accès | Actions |
|---|---|---|
| **ADMIN** | Tout | Créer utilisateurs, gérer restaurant, paramétrer devise/téléphone, voir toutes les stats |
| **MANAGER** | Tout | Créer plannings, assigner/transférer tables, voir stats |
| **SERVEUR** | Tables assignées + commandes | Valider/servir commandes, voir ses tables, recevoir toasts temps réel |
| **CUISINE** | Commandes à préparer | Changer statut commandes et détails, recevoir toasts nouvelles commandes |
| **BAR** | Commandes bar | Même chose pour les boissons |
| **CAISSIER** | Paiements | Encaisser, voir caisse du jour, factures, clôturer caisse |

---

## 15. FONCTIONNALITÉS COMPLÉMENTAIRES

### Planning des employés
- Admin/Manager crée des plannings pour chaque employé
- Filtre par date et par rôle
- Le planning détermine l'affectation automatique des tables
- Bloque la connexion des serveurs sans planning du jour

### Menu et catégories
- Création/modification des plats avec prix, image, temps de préparation
- Catégories avec destination (CUISINE, BAR, DESSERT)
- Ordre de service pour l'affichage
- Activation/désactivation des plats
- Upload d'images (JPEG, PNG, WEBP)

### Statistiques
- Chiffre d'affaires du jour
- Plats les plus populaires
- Performance des serveurs
- Taux d'occupation / affluence horaire

### Caisse
- Encaissement par mode de paiement (Espèces, Mobile Money, Carte Bancaire)
- Clôture de caisse journalière
- Historique des factures avec filtre par date
- Impression des factures en HTML

### Notifications
- En temps réel via Socket.IO (toasts)
- Centre de notifications avec historique
- Marquage lu/non lu (individuel ou en masse)

### Profil utilisateur
- Photo de profil
- Changement de mot de passe
- Mot de passe oublié (réinitialisation par téléphone)

---

*Documentation mise à jour le 28 mai 2026 — RestoPro v1.0*
