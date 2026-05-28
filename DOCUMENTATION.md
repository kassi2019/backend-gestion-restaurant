# RestoPro — Documentation Complète

## Parcours Client : De l'Entrée à la Sortie

---

## 1. ARRIVÉE DU CLIENT

### 1.1 Le client scanne le QR Code

Chaque table possède un QR code unique contenant une URL absolue :
`http://<IP>:3000/client.html?tableId=3&restaurantId=1`

### 1.2 Restauration de session

- **localStorage** : la `sessionKey` survit à la fermeture du navigateur
- **Fraîcheur** : session restaurée si < 6 heures
- **Fallback table** : commandes actives du jour si pas de localStorage
- **Nettoyage auto** : si tout est payé → localStorage vidé

### 1.3 Commandes à emporter (Comptoir)

Tables avec zone `Comptoir` ou numéro `T00` :
- Commande → **auto-validée** (pas de serveur)
- Numéro unique `CMD-XXXX` généré et affiché
- Notification directe en cuisine/bar
- Le client donne son `CMD-XXXX` à la caisse pour payer

---

## 2. COMMANDE PAR LE CLIENT

### 2.1 Le client commande

**Endpoint** : `POST /api/commandes/client`

### 2.2 Annulation

Tant que la commande est **EN_ATTENTE** :
- **✕ Article** : retire un article spécifique
- **✕ Annuler** : annule toute la commande
- Si dernier article retiré → commande → ANNULEE

### 2.3 Demande d'addition

Bouton **🧾 Demander l'addition** visible uniquement quand une commande est **SERVIE**.
Notifications envoyées au serveur et au caissier.

---

## 3. CYCLE DE VIE D'UNE COMMANDE

```
EN_ATTENTE     → Client a envoyé (annulable)
    │ [Serveur : ✓ Valider]
VALIDEE        → Table → OCCUPEE (si sur place)
    │ [Cuisine/Bar : 👨‍🍳 En préparation]
EN_PREPARATION → En cours de préparation
    │ [Articles → PRET un par un ou "Tout prêt"]
PRETE          → Tous les articles prêts (automatique)
    │ [Serveur : 🍽 Servie]
SERVIE         → Servi, bouton addition visible
    │ [Caissier : 💰 Payer]
PAYEE          → Table → LIBRE (si plus de commandes actives)
```

### Règles métier

| Transition | Qui | Condition |
|---|---|---|
| EN_ATTENTE → VALIDEE | Serveur | - |
| EN_ATTENTE → ANNULEE | Client | Via API avec sessionKey |
| VALIDEE → EN_PREPARATION | Cuisine/Bar | Bouton par commande ou "Tout prêt" |
| Article → PRET | Cuisine/Bar | Unitaire ou "Tout prêt" par table |
| → PRETE | **Automatique** | Tous les articles (cuisine + bar) PRET |
| PRETE → SERVIE | Serveur | - |
| SERVIE → PAYEE | Caissier | - |
| Table → LIBRE | **Automatique** | Après paiement, si 0 commande active (EN_ATTENTE ignorées) |

---

## 4. INTERFACES PAR ACTEUR

### 4.1 Dashboard Cuisine (dédié)

- **Stats** : À préparer / En cours / Prêtes
- **Tri FIFO** : plus ancien en haut
- **⏱ Timer** : minutes d'attente
- **Code couleur** : 🔴 >15min / 🟡 5-15min / 🟢 <5min
- **Actions** : "En préparation" par commande, "Prêt" par article, "Tout prêt" par table
- **Montants** : total cuisine/dessert uniquement

### 4.2 Dashboard Bar (dédié)

- Même structure que la cuisine
- **Montants** : total bar uniquement

### 4.3 Dashboard Caissier

- **Caisse du jour** : transactions depuis la dernière clôture
- **Recherche par CMD** : taper le numéro → clic → paiement direct
- **Aperçu reçu** : avant impression
- **Clôture caissier** : enregistre le bilan, remplaçant repart à zéro
- **Factures** : historique avec réimpression (🖨)

### 4.4 Dashboard Serveur

- Stats du jour filtrées par ses commandes
- Accès rapide à ses tables et commandes

### 4.5 Dashboard Admin/Manager

- Vue complète, contrôle total
- **Clôture globale** : ferme le restaurant jusqu'à réouverture
- **Statistiques** : avec filtre par intervalle de date

### 4.6 Interface Client (Web)

- Menu responsive par catégories
- Panier, confirmation, historique temps réel (Socket.IO)
- Annulation article/commande (si EN_ATTENTE)
- Demande d'addition (si SERVIE)
- Restauration automatique de session
- Numéro CMD-XXXX pour les commandes comptoir

---

## 5. PAIEMENTS ET CAISSE

### 5.1 Paiement

**Endpoint** : `POST /api/paiements/payer/:commandeId`

1. Commande → PAYEE
2. Facture générée `FAC-AAAAMMJJ-XXXX`
3. Reçu affiché → possibilité d'imprimer/télécharger
4. Table → LIBRE si plus aucune commande active

### 5.2 Clôture Caissier

Chaque caissier ne voit que **ses transactions** (depuis sa dernière clôture).
Un remplaçant arrive → dashboard à zéro.

### 5.3 Clôture Globale (Admin/Manager)

- Ferme le restaurant : plus de commandes possibles
- Définit une date/heure de réouverture
- **Réouverture automatique** à l'heure prévue

### 5.4 Modes de paiement

ESPECES / MOBILE_MONEY / CARTE_BANCAIRE

---

## 6. GESTION DES TABLES

### 6.1 QR Codes

- URL absolue générée automatiquement à la création
- L'IP du serveur est lue depuis `.env` (ADRESSE_IP)
- Image QR dynamique : `/qr-table-:id.png`
- Page d'administration : `/qrcodes.html`

### 6.2 Zones disponibles

Terrasse, Intérieur, VIP, **Comptoir**

### 6.3 Affectation

- Assignation serveur/table
- Transfert en cas d'absence
- Vérification quotidienne automatique selon planning

---

## 7. PLANNING

### 7.1 Règles

- Obligatoire pour : SERVEUR, CUISINE, BAR, CAISSIER
- Non requis pour : ADMIN, MANAGER
- Planning du jour vérifié à la connexion

### 7.2 Filtres

- Listes déroulantes par **Rôle** et par **Agent**
- Filtre par date avec calendrier

---

## 8. NOTIFICATIONS

### 8.1 Canaux

| Canal | Technologie |
|---|---|
| Toasts visuels | react-native-toast-message (design 3D) |
| Son | expo-av (bip WAV) |
| Vibration | React Native Vibration API |
| Socket.IO | Temps réel |

### 8.2 Événements

| Événement | Destinataire |
|---|---|
| `nouvelle_commande` | Serveur assigné |
| `nouvelle_commande_cuisine` | Cuisine |
| `nouvelle_commande_bar` | Bar |
| `commande_status_change` | Serveur + Admin |
| `demande_facture` | Serveur + Admin |
| `notification_user` | Utilisateur spécifique |
| `notification_admin` | Admin/Manager/Caissier |
| `commande_status` | Client (table) |

---

## 9. STATISTIQUES

### 9.1 Filtres

- **Intervalle de date** : Du ... Au ... (par défaut : aujourd'hui)
- Toutes les sections sont filtrées par la période

### 9.2 Sections

| Section | Contenu |
|---|---|
| 📋 Commandes | Total, CA, panier moyen (cliquable → détail) |
| 🪑 Tables | Total, occupation, moyenne par table (cliquable) |
| 👤 Serveurs | Performance avec barres, filtré par planning |
| 💰 Caissiers | Performance avec barres (factures, CA, détail par mode) |
| 🏆 Top Plats | Classement par quantité vendue |
| 📈 Affluence | Graphique par heure |

---

## 10. SÉCURITÉ

- **Authentification** : JWT (12h) + Bcrypt (10 rounds)
- **Double vérification** : Statut ACTIF + Planning du jour
- **SessionKey** : vérifie la propriété des commandes client
- **Token JWT dans l'URL** : pour l'impression des reçus
- **Guards par rôle** : chaque endpoint vérifie les permissions

---

## 11. RÔLES ET PERMISSIONS

| Rôle | Actions principales |
|---|---|
| **ADMIN** | Tout + clôture globale |
| **MANAGER** | Plannings, affectations, stats, clôture globale |
| **SERVEUR** | Valider, Servir, voir ses tables/commandes |
| **CUISINE** | Dashboard FIFO, En prépa, Prêt article/table |
| **BAR** | Dashboard FIFO, En prépa, Prêt article/table |
| **CAISSIER** | Paiements, factures, recherche CMD, clôture caissier |

---

## 12. ROUTES API

### Commandes (`/api/commandes`)
| Méthode | Route | Accès |
|---|---|---|
| POST | /client | Public |
| POST | /client-annuler | Public |
| POST | /client-annuler-detail | Public |
| POST | /demande-facture | Public |
| GET | /client-session/:key | Public |
| GET | /table-public/:id | Public |
| GET | /recherche/:term | JWT |
| POST | /tout-pret | CUISINE, BAR |
| PATCH | /:id/statut | ADMIN, MANAGER, SERVEUR, CUISINE, BAR |
| PATCH | /details/:id/statut | CUISINE, BAR |

### Paiements (`/api/paiements`)
| Méthode | Route | Accès |
|---|---|---|
| GET | /caisse/jour | CAISSIER (ses transactions), ADMIN/MANAGER (tout) |
| POST | /caisse/cloture | ADMIN, MANAGER, CAISSIER |
| POST | /caisse/cloture-globale | ADMIN, MANAGER |
| GET | /caisse/clotures | ADMIN, MANAGER |
| GET | /caisse/statut-restaurant/:id | Public |

### Statistiques (`/api/statistiques`) — ADMIN, MANAGER
| Méthode | Route | Params |
|---|---|---|
| GET | /dashboard | debut, fin |
| GET | /ventes | debut, fin |
| GET | /plats-populaires | limit, debut, fin |
| GET | /performance-serveurs | debut, fin |
| GET | /performance-caissiers | debut, fin |
| GET | /affluence | debut, fin |

---

*Documentation mise à jour le 28 mai 2026 — RestoPro v3.0*
