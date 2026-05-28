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

Chaque personne qui scanne le QR code reçoit un `clientRef` unique (ex: `CLI-A7B2`). Le backend génère une `sessionKey` unique (format `TB{idTable}-{timestamp}`).

### 1.3 Restauration de session

Si le client ferme son navigateur et rescanne le QR code :

1. **localStorage** : la `sessionKey` est sauvegardée dans le navigateur. Si elle existe encore et que la session a moins de **6 heures**, les commandes sont restaurées automatiquement.
2. **Fallback table** : si pas de session en localStorage, le système recherche les commandes actives (non payées, non annulées) de la table dont la **session a commencé aujourd'hui**.
3. **Nettoyage auto** : si toutes les commandes sont payées, le localStorage est vidé.

> **Scénarios gérés** :
> - Même visite passant minuit (23:50 → 00:05) : session < 6h → restaurée
> - Même téléphone le lendemain : session > 6h → nettoyée, nouveau départ
> - Nouveau client aujourd'hui sur table hier occupée : la session d'hier est ignorée

---

## 2. COMMANDE PAR LE CLIENT

### 2.1 Le client compose sa commande

Le client parcourt les catégories, ajoute des articles au panier.

### 2.2 Le client confirme

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
1. Une session est créée (ou réutilisée via `sessionKey`)
2. La commande est créée avec le statut **EN_ATTENTE**
3. Une notification temps réel est envoyée au **serveur** assigné
4. Si CUISINE/DESSERT → notification **Cuisine**
5. Si BAR → notification **Bar**
6. Notification sauvegardée en base

### 2.3 Le client peut annuler ou modifier

Tant que la commande est **EN_ATTENTE** (serveur pas encore validé) :
- **✕ sur un article** : retire un article spécifique (`POST /api/commandes/client-annuler-detail`)
- **✕ Annuler** : annule toute la commande (`POST /api/commandes/client-annuler`)
- Si le dernier article est retiré → la commande passe automatiquement en ANNULEE

Une fois validée par le serveur, **plus aucune modification possible** par le client.

---

## 3. TRAITEMENT PAR LE SERVEUR

### 3.1 Le serveur voit les commandes en attente

**Endpoint** : `GET /api/commandes/serveur` — renvoie uniquement les commandes du serveur connecté.

### 3.2 Le serveur valide la commande

**Endpoint** : `PATCH /api/commandes/:id/statut` avec `{ "statut": "VALIDEE" }`

**Ce qui se passe :**
1. Commande `EN_ATTENTE` → `VALIDEE`
2. **Table → OCCUPEE**
3. Notifications cuisine/bar déclenchées selon le contenu

**Après validation, le serveur n'a plus d'action** jusqu'à ce que la commande soit `PRETE`.

### 3.3 Le cycle de vie de la commande

```
EN_ATTENTE     → Client a envoyé, peut encore annuler
    │
    ▼ [Serveur : ✓ Valider]
VALIDEE        → Serveur a confirmé, table → OCCUPEE
    │
    ▼ [Cuisine/Bar : 👨‍🍳 En préparation]
EN_PREPARATION → En cours de préparation
    │
    ▼ [Cuisine/Bar : ✅ Prêt sur chaque article]
PRETE          → Tous les articles sont prêts (automatique)
    │
    ▼ [Serveur : 🍽 Servie]
SERVIE         → Servi au client, bouton "Demander l'addition" visible
    │
    ▼ [Caissier : 💰 Payer]
PAYEE          → Payé, table → LIBRE (si plus aucune commande active)

ANNULEE        → Annulée (client avant validation, ou admin)
```

### 3.4 Statuts de préparation par article

Chaque article a son propre suivi :
- **EN_PREPARATION** (défaut)
- **PRET** (marqué par cuisine/bar)

Quand **tous** les articles d'une commande sont PRET → la commande passe automatiquement à `PRETE`.

---

## 4. TRAITEMENT PAR LA CUISINE ET LE BAR

### 4.1 Dashboard dédié

La cuisine et le bar ont chacun un **dashboard dédié** avec :

| Fonctionnalité | Description |
|---|---|
| **Stats** | À préparer / En cours / Prêtes |
| **Tri FIFO** | Les commandes les plus anciennes en haut |
| **⏱ Timer** | Minutes écoulées depuis la commande |
| **Code couleur** | 🔴 >15 min (urgent) / 🟡 5-15 min / 🟢 <5 min |
| **Articles détaillés** | Chaque article avec son statut |
| **Temps réel** | Nouvelles commandes = apparition instantanée |

### 4.2 Actions disponibles

| Qui | Bouton | Effet |
|---|---|---|
| Cuisine | **👨‍🍳 En préparation** | VALIDEE → EN_PREPARATION |
| Cuisine | **✅ Prêt** (par article) | Article → PRET |
| Cuisine | **✅ Tout prêt** (par table) | Tous les articles cuisine de la table → PRET |
| Bar | **👨‍🍳 En préparation** | VALIDEE → EN_PREPARATION |
| Bar | **✅ Prêt** (par article) | Article → PRET |
| Bar | **✅ Tout prêt** (par table) | Tous les articles bar de la table → PRET |

### 4.3 Passage automatique à PRETE

Quand le **dernier article** (cuisine + bar) passe à PRET → la commande passe automatiquement à `PRETE` → le serveur est notifié.

### 4.4 Montants par acteur

Chaque acteur voit uniquement le **total de ses articles** :
- **Cuisine** : total des articles CUISINE + DESSERT uniquement
- **Bar** : total des articles BAR uniquement
- Le montant global de la commande reste visible par le caissier et l'admin

---

## 5. PAIEMENT PAR LE CAISSIER

### 5.1 Commandes à payer

**Endpoint** : `GET /api/paiements/a-payer` — commandes SERVIE non payées.

### 5.2 Paiement

**Endpoint** : `POST /api/paiements/payer/:commandeId` avec `{ "mode": "ESPECES" }`

1. Commande → `PAYEE`
2. Facture générée (`FAC-AAAAMMJJ-XXXX`)
3. Vérification : autres commandes non payées sur la table ?
   - **NON** → table → `LIBRE` (les commandes EN_ATTENTE ne bloquent pas)
4. Le reçu s'affiche avec possibilité d'**imprimer/télécharger**

### 5.3 Factures et historique

| Endpoint | Description |
|---|---|
| `GET /api/paiements/factures` | Liste des factures (filtrable par `?date=`) |
| `GET /api/paiements/factures/:id` | Détail |
| `GET /api/paiements/factures/:id/imprimer?token=` | Reçu HTML imprimable |

Dans le dashboard caissier, chaque facture de l'historique est **cliquable** (🖨) pour réimprimer le reçu.

### 5.4 Caisse

| Endpoint | Description |
|---|---|
| `GET /api/paiements/caisse/jour` | Résumé du jour par mode de paiement |
| `POST /api/paiements/caisse/cloture` | Clôture de caisse |

---

## 6. GESTION DES TABLES ET SERVEURS

### 6.1 Endpoints

| Endpoint | Accès | Description |
|---|---|---|
| `GET /api/tables` | ADMIN, MANAGER, SERVEUR | Toutes les tables |
| `GET /api/tables/serveur` | SERVEUR | Tables assignées |
| `POST /api/tables` | ADMIN, MANAGER | Créer |
| `PATCH /api/tables/:id/assign` | ADMIN, MANAGER | Assigner serveur |
| `PATCH /api/tables/:id/statut` | ADMIN, MANAGER, SERVEUR | Changer statut |
| `GET /api/tables/:id/qrcode` | JWT | Données QR code |

### 6.2 Affectation quotidienne automatique

**Endpoint** : `POST /api/serveur-tables/run-check`

1. Vérifie le planning du jour
2. Serveurs absents → désactivés, tables libérées
3. Tables libres → redistribuées aux serveurs actifs

### 6.3 Transfert en cas d'absence

**Endpoint** : `PATCH /api/serveur-tables/reassign`

```json
{ "fromServeurId": 2, "toServeurId": 3, "tableId": 5 }
```

Sans `tableId` → toutes les tables sont transférées.

---

## 7. NOTIFICATIONS EN TEMPS RÉEL

### 7.1 Événements Socket.IO

| Événement | Destinataire | Toast | Son |
|---|---|---|---|
| `nouvelle_commande` | `serveur:{id}` | ✅ | 🔊 |
| `nouvelle_commande_cuisine` | `cuisine` | ✅ | 🔊 |
| `nouvelle_commande_bar` | `bar` | ✅ | 🔊 |
| `commande_status_change` | `serveur:{id}`, `admin` | ✅ | 🔊 |
| `demande_facture` | `serveur:{id}`, `admin` | ✅ | 🔊 |
| `notification_user` | `serveur:{id}` | ✅ | 🔊 |
| `notification_admin` | `admin` | ✅ | 🔊 |
| `commande_status` | `table:{id}` (client) | ✅ | - |

### 7.2 Rooms

| Room | Membres |
|---|---|
| `serveur:{userId}` | Un serveur |
| `cuisine` | Tous les cuisiniers |
| `bar` | Tous les barmen |
| `admin` | Admins, managers, caissiers |
| `table:{tableId}` | Client(s) d'une table |

### 7.3 Apparence des toasts

Les notifications utilisent un design **3D moderne** avec ombres prononcées, coins arrondis (20px), bande colorée à gauche et icône.

---

## 8. DEMANDE D'ADDITION

### 8.1 Côté client

Le bouton **🧾 Demander l'addition** apparaît **uniquement** quand au moins une commande est `SERVIE`.

**Endpoint** : `POST /api/commandes/demande-facture`

### 8.2 Côté staff

Le serveur et le caissier reçoivent une notification : *"🧾 Demande d'addition — Table X"*. Le serveur apporte la facture physique au client.

---

## 9. INTERFACE CLIENT (client.html)

### 9.1 Fonctionnalités

- Menu par catégories avec images zoomables
- Panier avec +/- et suppression
- Confirmation de commande
- **Historique des commandes** avec statut en temps réel (Socket.IO)
- **Annulation d'article** (✕) tant que EN_ATTENTE
- **Annulation de commande** (✕ Annuler) tant que EN_ATTENTE
- **Demande d'addition** (visible quand SERVIE)
- **Restauration automatique** de session (localStorage + fallback table)

### 9.2 URLs publiques

| URL | Description |
|---|---|
| `/client.html?tableId=X&restaurantId=Y` | Page de commande |
| `/qrcodes.html` | Liste des QR codes |
| `/qr-table-X.png` | QR code image |

---

## 10. RÉSUMÉ DES ÉTATS

### Statuts de table
```
LIBRE     → Disponible
OCCUPEE   → Client présent, commande validée
RESERVEE  → Réservée
```

### Statuts de commande
```
EN_ATTENTE     → Client a envoyé (annulable)
VALIDEE        → Serveur a confirmé
EN_PREPARATION → Cuisine/bar préparent
PRETE          → Tous les articles prêts (automatique)
SERVIE         → Servi au client (demande addition possible)
PAYEE          → Payé, table → LIBRE
ANNULEE        → Annulée
```

### Statuts de préparation (articles)
```
EN_PREPARATION → En attente de préparation
PRET           → Article prêt
```

### Statuts de paiement
```
NON_PAYEE  → Pas encore payé
PAYEE      → Payé
REMBOURSEE → Remboursé
```

---

## 11. RÔLES ET PERMISSIONS

| Rôle | Actions principales |
|---|---|
| **ADMIN** | Tout : utilisateurs, restaurant, stats, configuration |
| **MANAGER** | Plannings, affectations, stats, toutes les actions de statut |
| **SERVEUR** | Valider (EN_ATTENTE→VALIDEE), Servir (PRETE→SERVIE), voir ses tables |
| **CUISINE** | Dashboard FIFO, En préparation (VALIDEE→EN_PREPARATION), Prêt par article, Tout prêt par table |
| **BAR** | Dashboard FIFO, En préparation, Prêt par article, Tout prêt par table |
| **CAISSIER** | Paiements, factures, réimpression, caisse, clôture |

---

## 12. ROUTES API COMPLÈTES

### Auth (`/api/auth`)
| Méthode | Route | Accès |
|---|---|---|
| POST | /login | Public |
| POST | /register | Public |
| GET | /profile | JWT |
| PATCH | /profile | JWT |
| POST | /photo | JWT |
| PATCH | /password | JWT |
| POST | /forgot-password | Public |

### Commandes (`/api/commandes`)
| Méthode | Route | Accès |
|---|---|---|
| POST | /client | Public |
| POST | /client-annuler | Public (vérifié par sessionKey) |
| POST | /client-annuler-detail | Public (vérifié par sessionKey) |
| POST | /demande-facture | Public |
| GET | /client-session/:sessionKey | Public |
| GET | /table-public/:tableId | Public |
| GET | / | ADMIN, MANAGER |
| GET | /serveur | ADMIN, MANAGER, SERVEUR |
| GET | /cuisine | CUISINE |
| GET | /bar | BAR |
| GET | /table/:tableId | ADMIN, MANAGER, SERVEUR |
| GET | /stats | JWT |
| PATCH | /:id/statut | ADMIN, MANAGER, SERVEUR, CUISINE, BAR |
| PATCH | /details/:id/statut | CUISINE, BAR |
| POST | /tout-pret | CUISINE, BAR |

### Paiements (`/api/paiements`)
| Méthode | Route | Accès |
|---|---|---|
| GET | /a-payer | ADMIN, MANAGER, CAISSIER |
| POST | /payer/:commandeId | ADMIN, MANAGER, CAISSIER |
| GET | /factures | ADMIN, MANAGER, CAISSIER |
| GET | /factures/:id | ADMIN, MANAGER, CAISSIER |
| GET | /factures/:id/imprimer | Public (avec token JWT en query) |
| GET | /caisse/jour | ADMIN, MANAGER, CAISSIER |
| POST | /caisse/cloture | ADMIN, MANAGER, CAISSIER |

---

## 13. SÉCURITÉ

- **Authentification** : JWT (12h) + Bcrypt (10 rounds)
- **Vérification planning** : les serveurs sans planning du jour ne peuvent pas se connecter
- **SessionKey** : utilisé pour vérifier que le client est bien propriétaire de sa commande
- **Token JWT dans l'URL** : pour l'impression des reçus (le navigateur n'a pas le token)
- **Guards par rôle** : chaque endpoint vérifie les permissions

---

*Documentation mise à jour le 28 mai 2026 — RestoPro v2.0*
