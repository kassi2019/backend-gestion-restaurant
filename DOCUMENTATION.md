# RestoPro — Documentation Complète

## Parcours Client : De l'Entrée à la Sortie

---

## 1. ARRIVÉE DU CLIENT

### 1.1 Le client scanne le QR Code

Chaque table possède un QR code unique contenant une URL absolue :
`http://<IP>:3000/client.html?tableId=3&restaurantId=1`

### 1.2 Restauration de session

- **localStorage** : la `sessionKey` survit à la fermeture du navigateur
- **Device ID** : identifiant unique par appareil pour suivre les commandes non payées
- **Fraîcheur** : session restaurée si < 6 heures
- **Fallback table** : commandes actives du jour si pas de localStorage
- **Nettoyage auto** : si tout est payé → localStorage vidé

### 1.3 Commandes à emporter (Comptoir)

Tables avec zone `Comptoir` ou numéro `T00` :
- Commande → **auto-validée** (pas de serveur)
- Numéro unique `CMD-XXXX` généré et affiché
- Notification directe en cuisine/bar
- Le client donne son `CMD-XXXX` à la caisse pour payer

### 1.4 Assistant IA de commande

**Endpoint** : `POST /api/commandes/assistant`

Le client peut commander par texte ou voix :
1. Tape ou dicte son message (ex: "Je voudrais 2 poulets braisés et un riz gras")
2. L'IA (Claude) analyse le message et retrouve les plats correspondants
3. Les articles sont proposés avec prix et quantités
4. Le client confirme → la commande est créée

---

## 2. COMMANDE PAR LE CLIENT

### 2.1 Le client commande

**Endpoint** : `POST /api/commandes/client`

Le `deviceId` est envoyé pour permettre le suivi cross-appareil.

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

### 3.1 Mode SERVEUR (classique)

```
EN_ATTENTE     → Client a envoyé (annulable)
    │ [Serveur ou Réceptionniste : ✓ Valider]
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

### 3.2 Mode RÉCEPTION (sans serveur dédié)

```
EN_ATTENTE     → Client a envoyé
    │ [Réceptionniste : ✓ Valider]
RECEPTION_VALIDE → Validé par la réception
    │ [Cuisine/Bar : 👨‍🍳 En préparation]
EN_PREPARATION → En cours de préparation
    │ [Articles → PRET un par un ou "Tout prêt"]
PRETE          → Tous les articles prêts
    │ [Réceptionniste : 🍽 Servie]
SERVIE         → Servi
    │ [Caissier : 💰 Payer]
PAYEE          → Terminé
```

### 3.3 Mode CAISSE (commande directe)

```
Le caissier crée la commande → paiement immédiat → PAYEE
```

### 3.4 Règles métier

| Transition | Qui | Condition |
|---|---|---|
| EN_ATTENTE → VALIDEE | Serveur | Mode SERVEUR |
| EN_ATTENTE → RECEPTION_VALIDE | Réceptionniste | Mode RECEPTION |
| EN_ATTENTE → ANNULEE | Client | Via API avec sessionKey |
| VALIDEE/RECEPTION_VALIDE → EN_PREPARATION | Cuisine/Bar | Bouton par commande ou "Tout prêt" |
| Article → PRET | Cuisine/Bar | Unitaire ou "Tout prêt" par table |
| → PRETE | **Automatique** | Tous les articles (cuisine + bar) PRET |
| PRETE → SERVIE | Serveur/Réceptionniste | - |
| SERVIE → PAYEE | Caissier | - |
| Table → LIBRE | **Automatique** | Après paiement, si 0 commande active |

---

## 4. INTERFACES PAR ACTEUR

### 4.1 Dashboard Cuisine (dédié)

- **Stats** : À préparer / En cours / Prêtes
- **Tri FIFO** : plus ancien en haut
- **⏱ Timer** : minutes d'attente
- **Code couleur** : 🔴 >15min / 🟡 5-15min / 🟢 <5min
- **Actions** : "En préparation" par commande, "Prêt" par article, "Tout prêt" par table
- **Montants** : total cuisine/dessert uniquement
- **Impression automatique** : ticket cuisine si `AUTO_PRINT=true`

### 4.2 Dashboard Bar (dédié)

- Même structure que la cuisine
- **Montants** : total bar uniquement
- **Impression automatique** : ticket bar si `AUTO_PRINT=true`

### 4.3 Dashboard Caissier

- **Caisse du jour** : transactions depuis la dernière clôture
- **Recherche par CMD** : taper le numéro → clic → paiement direct
- **Remise** : appliquer une réduction (% ou montant) avec motif
- **Aperçu reçu** : avant impression
- **Impression reçu** : thermique ou HTML
- **Clôture caissier** : enregistre le bilan, remplaçant repart à zéro
- **Factures** : historique avec réimpression (🖨)
- **Caisse directe** : création commande + paiement immédiat

### 4.4 Dashboard Serveur

- Stats du jour filtrées par ses commandes
- Accès rapide à ses tables et commandes
- Planning du jour

### 4.5 Dashboard Réceptionniste

- **Accueil** : création de commandes, gestion des réservations
- **Livraisons** : assignation et suivi des livreurs
- **Commandes** : suivi complet du cycle de vie
- Vue complète des tables et commandes

### 4.6 Dashboard Admin/Manager

- Vue complète, contrôle total
- **Clôture globale** : ferme le restaurant jusqu'à réouverture
- **Statistiques** : avec filtre par intervalle de date
- **Zones tarifaires** : gestion des zones et coefficients
- **Modules** : assignation dynamique par utilisateur

### 4.7 Dashboard Livreur

- **Livraisons actives** : liste des commandes à livrer
- **Mes livraisons** : filtré par livreur connecté
- **Statuts** : A_LIVRER → EN_COURS → LIVREE / ECHEC

### 4.8 Dashboard Super Admin

- **Stats globales** : Total restos, En règle, En essai, Expirés
- **Codes d'activation** : génération, consultation, suppression
- **Plans d'abonnement** : CRUD complet (MENSUEL, TRIMESTRIEL, ANNUEL)
- **Paiements en attente** : confirmation ou rejet
- **Modules par restaurant** : configuration du périmètre fonctionnel

### 4.9 Interface Client (Web)

- Menu responsive par catégories
- Variantes de plats avec prix distincts
- Panier, confirmation, historique temps réel (Socket.IO)
- Annulation article/commande (si EN_ATTENTE)
- Demande d'addition (si SERVIE)
- Restauration automatique de session
- Numéro CMD-XXXX pour les commandes comptoir
- **Assistant IA** : commande vocale ou texte
- **Restaurant fermé** : message rouge avec date et heure de réouverture, menu masqué
- **Device ID** : persistance des commandes par appareil

---

## 5. PAIEMENTS ET CAISSE

### 5.1 Paiement

**Endpoint** : `POST /api/paiements/payer/:commandeId`

1. Commande → PAYEE
2. Facture générée `FAC-AAAAMMJJ-XXXX`
3. Reçu affiché → possibilité d'imprimer (thermique ou HTML)
4. Table → LIBRE si plus aucune commande active

### 5.2 Remises

**Endpoint** : `PATCH /api/paiements/remise/:commandeId`

Deux types de remises :
- **POURCENTAGE** : réduction en % (ex: 10% → 10)
- **MONTANT** : réduction fixe (ex: 500 FCFA)
- **Motif** obligatoire pour la traçabilité

### 5.3 Caisse directe

**Endpoint** : `POST /api/commandes/caisse-directe`

Le caissier crée une commande et la paie immédiatement :
1. Sélection des articles
2. Choix du mode de paiement
3. Création + paiement en une étape

### 5.4 Clôture Caissier

Chaque caissier ne voit que **ses transactions** (depuis sa dernière clôture).
Un remplaçant arrive → dashboard à zéro.

### 5.5 Clôture Globale (Admin/Manager uniquement)

- Accessible depuis **Profil → Paramètres du restaurant → 🔒 Clôture Globale**
- Ferme le restaurant : plus de commandes possibles, menu client masqué
- Définit une date et heure de réouverture
- **Réouverture automatique** à l'heure prévue
- Message rouge affiché sur la page client : "Restaurant fermé. Réouverture le [date] à [heure]"
- Possibilité de réouvrir manuellement

### 5.6 Modes de paiement

ESPECES / MOBILE_MONEY / CARTE_BANCAIRE

---

## 6. GESTION DES TABLES

### 6.1 QR Codes

- URL absolue générée automatiquement à la création
- L'IP du serveur est lue depuis `.env` (ADRESSE_IP)
- Image QR dynamique : `/qr-table-:id.png`
- Page d'administration : `/qrcodes.html`

### 6.2 Zones tarifaires

Chaque table appartient à une zone qui définit un coefficient multiplicateur :

| Zone | Coefficient typique |
|------|---------------------|
| Intérieur | 1.0 |
| Terrasse | 1.1 |
| VIP | 1.3 |
| Comptoir | 1.0 |

- CRUD complet des zones
- Assignation/désassignation des tables à une zone
- Les prix sont automatiquement ajustés côté client

### 6.3 Affectation serveur/table

- Assignation serveur/table
- Transfert en cas d'absence
- Vérification quotidienne automatique selon planning
- Mode réception : pas de serveur dédié, le réceptionniste gère tout

### 6.4 Réservations

**Endpoint** : `POST /api/reservations`

- Réservation avec nom, téléphone, nombre de personnes
- Date et table optionnelle
- Statuts : EN_ATTENTE → CONFIRMEE → HONOREE / ANNULEE
- Gestion par le réceptionniste

---

## 7. MENU ET VARIANTES

### 7.1 Variantes

Chaque plat peut avoir des variantes avec prix distincts :

```
Exemple : Jus de Bissap
  → Sans alcool : 500 FCFA
  → Avec alcool : 1500 FCFA
```

- CRUD des variantes par plat
- Affichage dans le QR code client
- Prix calculé automatiquement selon la variante choisie

### 7.2 Gestion du stock

| Valeur | Signification |
|--------|--------------|
| **-1** | Illimité |
| **> 0** | Stock disponible |
| **0** | Épuisé → grisé automatiquement |

- Décrémentation automatique à la validation des commandes
- `disponibleDemain` : contrôle de visibilité pour le jour suivant (0=non, 1=oui)
- `coutMatiere` : coût des matières premières pour calcul de marge

### 7.3 Import CSV

- Format : `nom,prix,categorieId,tempsPreparation,variantes`
- Variantes : `"Avec alcool:4000|Sans alcool:3500"`
- Modèle téléchargeable

---

## 8. LIVRAISONS

### 8.1 Cycle de vie d'une livraison

```
A_LIVRER    → Commande prête, en attente d'un livreur
    │ [Réceptionniste : assigner un livreur]
EN_COURS    → Livreur en route
    │ [Livreur : livrer]
LIVREE      → Livrée avec succès
    │ ou
ECHEC       → Échec de livraison
```

### 8.2 Gestion

- **Réceptionniste** : assigne les livraisons, définit l'adresse et les frais
- **Livreur** : voit uniquement ses livraisons, met à jour le statut
- **Frais de livraison** : ajoutés au montant total

---

## 9. PLANIFICATION (PLANNING)

### 9.1 Règles

- Obligatoire pour : SERVEUR, CUISINE, BAR, CAISSIER, LIVREUR
- Non requis pour : SUPER_ADMIN, ADMIN, MANAGER, RECEPTIONNISTE
- Planning du jour vérifié à la connexion
- Jours de repos configurables par employé

### 9.2 Filtres

- Listes déroulantes par **Rôle** et par **Agent**
- Filtre par date avec calendrier
- Stats du jour : actifs, absents, congés

---

## 10. NOTIFICATIONS

### 10.1 Canaux

| Canal | Technologie |
|---|---|
| Toasts visuels | react-native-toast-message (design 3D) |
| Son | expo-av (bip WAV) |
| Vibration | React Native Vibration API |
| Socket.IO | Temps réel |
| Badge compteur | Sidebar web et mobile |

### 10.2 Événements

| Événement | Destinataire |
|---|---|
| `nouvelle_commande` | Serveur assigné / Réceptionniste |
| `nouvelle_commande_cuisine` | Cuisine |
| `nouvelle_commande_bar` | Bar |
| `commande_status_change` | Serveur + Admin + Réceptionniste |
| `commande_pret` | Serveur + Admin + Réceptionniste |
| `demande_facture` | Serveur + Admin |
| `notification_user` | Utilisateur spécifique |
| `notification_admin` | Admin/Manager/Caissier |
| `commande_status` | Client (table) |
| `nouvelle_livraison` | Livreurs |
| `livraison_assignee` | Livreur spécifique |

---

## 11. STATISTIQUES

### 11.1 Filtres

- **Intervalle de date** : Du ... Au ... (par défaut : aujourd'hui)
- Toutes les sections sont filtrées par la période

### 11.2 Sections

| Section | Contenu |
|---|---|
| 📋 Commandes | Total, CA, panier moyen (cliquable → détail) |
| 🪑 Tables | Total, occupation, moyenne par table (cliquable) |
| 👤 Serveurs | Performance avec barres, filtré par planning |
| 💰 Caissiers | Performance avec barres (factures, CA, détail par mode) |
| 🏆 Top Plats | Classement par quantité vendue |
| 📉 Plats peu vendus | Identification des plats à améliorer |
| 📈 Affluence | Graphique par heure |
| 💹 Ventes/Jour | Évolution quotidienne du CA |
| 📊 Ventes/Mois | Évolution mensuelle du CA |
| 🧮 Marge brute | CA - coût matières premières |

---

## 12. IMPRESSION THERMIQUE

### 12.1 Types d'imprimantes supportées

| Type | Configuration |
|------|--------------|
| **WINDOWS** | Nom de l'imprimante ou chemin de partage |
| **NETWORK** | Adresse IP + port (ex: 192.168.1.100:9100) |
| **USB** | Port série ou USB |

### 12.2 Tickets

- **Ticket cuisine** : automatique à la validation, contient table, articles, heure
- **Ticket bar** : automatique à la validation, boissons uniquement
- **Ticket commande** : manuel, pour une commande spécifique
- **Reçu caisse** : après paiement, avec détails et TVA

### 12.3 Configuration

- `AUTO_PRINT=true` : impression automatique des tickets cuisine/bar
- `PRINTER_CHAR_WIDTH` : largeur en caractères (défaut 42 pour 80mm)
- Test d'impression disponible depuis l'interface admin

---

## 13. ABONNEMENT ET ACTIVATION

### 13.1 Fonctionnement

- **Trial 14j** automatique à la création du restaurant
- **Plans** : MENSUEL (30j), TRIMESTRIEL (90j), ANNUEL (365j)
- Configurés par le Super Admin (prix, durée, actif/inactif)
- Codes d'activation chiffrés en AES-256

### 13.2 Paiement d'abonnement

1. L'admin du resto choisit un plan → initie un paiement
2. Il reçoit les instructions de paiement (Wave / Orange Money)
3. Le Super Admin vérifie et confirme/rejette le paiement
4. Si confirmé → abonnement prolongé automatiquement

### 13.3 Notifications automatiques

- > 50% restant → toutes les 24h
- ≤ 50% restant → toutes les 3h
- Tous les utilisateurs du resto sont notifiés

### 13.4 Activation par code

- Code saisi dans l'app par l'admin
- Vérification AES → prolongation immédiate
- Historique complet enregistré

---

## 14. MODULES DYNAMIQUES

### 14.1 Principe

Chaque utilisateur voit **uniquement** les modules qui lui sont assignés.
La navigation (web et mobile) s'adapte automatiquement.

### 14.2 Niveaux de configuration

1. **Super Admin** : définit les modules disponibles pour un restaurant
2. **Admin/Manager** : assigne les modules à ses utilisateurs
   - Ne peut assigner que les modules qu'il possède lui-même
   - Ne peut pas assigner plus que le périmètre du restaurant

### 14.3 Modules disponibles

| Module | Icône | Route | Description |
|--------|-------|-------|-------------|
| Dashboard | 🏠 | /dashboard | Accueil par rôle |
| Commandes | 📋 | /commandes | Gestion des commandes |
| Caisse | 💰 | /caisse | Paiements et factures |
| Menu | 🍽️ | /menu | CRUD menu et variantes |
| Tables | 🪑 | /tables | Gestion des tables et QR |
| Planning | 📅 | /planning | Planning des employés |
| Users | 👥 | /users | Gestion des utilisateurs |
| Stats | 📊 | /stats | Statistiques et analytics |
| Livraisons | 🛵 | /livraisons | Gestion des livraisons |
| Stock | 📦 | /stock | Gestion des stocks |
| Affectation | 🔄 | /affectation | Tables → serveurs |
| Réservations | 📝 | /reservations | Réservations clients |
| Évaluations | ⭐ | /evaluations | Notation clients |
| Zones | 🏷️ | /zones | Zones tarifaires |
| Imprimante | 🖨️ | /imprimante | Config impression |
| Abonnement | ⭐ | /abonnement | État abonnement |
| Codes | 🔑 | /codes | Génération codes (Super Admin) |

---

## 15. ÉVALUATIONS CLIENTS

### 15.1 Notation

Après leur repas, les clients peuvent noter le restaurant :
- **Service** : 1 à 5 étoiles
- **Cuisine** : 1 à 5 étoiles
- **Ambiance** : 1 à 5 étoiles
- **Commentaire** optionnel
- Moyennes consultables par l'admin

---

## 16. SÉCURITÉ

- **Authentification** : JWT (12h) + Bcrypt (10 rounds)
- **Double vérification** : Statut ACTIF + Planning du jour
- **SessionKey** : vérifie la propriété des commandes client
- **Device ID** : suivi cross-appareil sans authentification
- **Token JWT dans l'URL** : pour l'impression des reçus
- **Guards par rôle** : chaque endpoint vérifie les permissions
- **Super Admin** : protégé par `SUPER_ADMIN_IDS` dans `.env`
- **AES-256** : chiffrement des codes d'activation
- **CORS** : configurable, toutes origines par défaut

---

## 17. RÔLES ET PERMISSIONS

| Rôle | Actions principales |
|---|---|
| **SUPER_ADMIN** | Dashboard global, abonnements, plans, codes, modules restaurant |
| **ADMIN** | Tout + clôture globale, zones, paramètres restaurant |
| **MANAGER** | Plannings, affectations, stats, clôture globale |
| **RECEPTIONNISTE** | Accueil, commandes, réservations, livraisons, affectations |
| **SERVEUR** | Valider, Servir, voir ses tables/commandes |
| **CUISINE** | Dashboard FIFO, En prépa, Prêt article/table |
| **BAR** | Dashboard FIFO, En prépa, Prêt article/table |
| **CAISSIER** | Paiements, factures, remises, recherche CMD, clôture caissier |
| **LIVREUR** | Voir/mettre à jour ses livraisons |

---

## 18. ROUTES API

### Commandes (`/api/commandes`)
| Méthode | Route | Accès |
|---|---|---|
| POST | /assistant | Public |
| POST | /client | Public |
| POST | /client-annuler | Public |
| POST | /client-annuler-detail | Public |
| POST | /demande-facture | Public |
| GET | /client-device/:deviceId | Public |
| GET | /client-session/:key | Public |
| GET | /table-public/:id | Public |
| GET | /recherche/:term | JWT |
| GET | /stats | ADMIN, MANAGER, SERVEUR, CUISINE, BAR, RECEPTIONNISTE |
| POST | / | ADMIN, MANAGER, RECEPTIONNISTE |
| POST | /tout-pret | CUISINE, BAR |
| POST | /caisse-directe | ADMIN, MANAGER, CAISSIER |
| PATCH | /:id/statut | ADMIN, MANAGER, SERVEUR, CUISINE, BAR, RECEPTIONNISTE |
| PATCH | /:id/assign-serveur | ADMIN, MANAGER, RECEPTIONNISTE |
| PATCH | /details/:id/statut | CUISINE, BAR |
| GET | /table/:tableId | ADMIN, MANAGER, SERVEUR, RECEPTIONNISTE |
| GET | /session/:sessionId | Public |
| GET | /livraisons | ADMIN, MANAGER, RECEPTIONNISTE |
| GET | /livraisons/actives | ADMIN, MANAGER, RECEPTIONNISTE, LIVREUR |
| GET | /livraisons/mes-livraisons | LIVREUR |
| PATCH | /:id/livraison | ADMIN, MANAGER, RECEPTIONNISTE |
| PATCH | /:id/livraison/statut | ADMIN, MANAGER, LIVREUR |
| POST | /:id/notifier-pret | ADMIN, MANAGER, RECEPTIONNISTE |

### Paiements (`/api/paiements`)
| Méthode | Route | Accès |
|---|---|---|
| GET | /a-payer | ADMIN, MANAGER, CAISSIER |
| PATCH | /remise/:commandeId | ADMIN, MANAGER, CAISSIER |
| POST | /payer/:commandeId | ADMIN, MANAGER, CAISSIER |
| GET | /factures | ADMIN, MANAGER, CAISSIER |
| GET | /factures/:id | ADMIN, MANAGER, CAISSIER |
| GET | /factures/:id/imprimer | Public (avec token JWT) |
| GET | /caisse/jour | ADMIN, MANAGER, CAISSIER |
| POST | /caisse/cloture | ADMIN, MANAGER, CAISSIER |
| POST | /caisse/cloture-globale | ADMIN, MANAGER |
| GET | /caisse/clotures | ADMIN, MANAGER |
| GET | /caisse/statut-restaurant/:id | Public |

### Auth (`/api/auth`)
| Méthode | Route | Accès |
|---|---|---|
| POST | /login | Public |
| POST | /register | Public |
| POST | /forgot-password | Public |
| GET | /profile | JWT |
| PATCH | /profile | JWT |
| PATCH | /password | JWT |
| POST | /photo | JWT |
| GET | /modules | JWT |
| POST | /users/:userId/modules | SUPER_ADMIN, ADMIN, MANAGER |
| GET | /restaurants/:restaurantId/modules | SUPER_ADMIN |
| POST | /restaurants/:restaurantId/modules | SUPER_ADMIN |
| GET | /abonnement | JWT |
| POST | /activer | Public |
| GET | /plans | Public |
| GET | /config-paiement | Public |
| POST | /paiement-abonnement | JWT |
| GET | /mes-paiements | JWT |
| GET | /paiements-en-attente | SUPER_ADMIN |
| PATCH | /paiements/:id/confirmer | SUPER_ADMIN |
| PATCH | /paiements/:id/rejeter | SUPER_ADMIN |
| GET | /plans/all | SUPER_ADMIN |
| POST | /plans | SUPER_ADMIN |
| PATCH | /plans/:id | SUPER_ADMIN |
| DELETE | /plans/:id | SUPER_ADMIN |
| POST | /generer-codes | SUPER_ADMIN |
| GET | /codes | SUPER_ADMIN |
| DELETE | /codes/:id | SUPER_ADMIN |
| GET | /super-dashboard | SUPER_ADMIN |
| GET | /historique/:restaurantId | SUPER_ADMIN |

### Statistiques (`/api/statistiques`) — ADMIN, MANAGER, RECEPTIONNISTE
| Méthode | Route | Params |
|---|---|---|
| GET | /dashboard | debut, fin |
| GET | /ventes | debut, fin |
| GET | /ventes-par-jour | debut, fin |
| GET | /ventes-par-mois | debut, fin |
| GET | /plats-populaires | limit, debut, fin |
| GET | /plats-moins-vendus | debut, fin |
| GET | /marge-brute | debut, fin |
| GET | /performance-serveurs | debut, fin |
| GET | /performance-caissiers | debut, fin |
| GET | /affluence | debut, fin |

### Réservations (`/api/reservations`) — ADMIN, MANAGER, RECEPTIONNISTE
| Méthode | Route |
|---|---|
| GET | / |
| GET | /:id |
| POST | / |
| PATCH | /:id |
| POST | /:id/honorer |
| POST | /:id/annuler |
| DELETE | /:id |

### Évaluations (`/api/evaluations`)
| Méthode | Route | Accès |
|---|---|---|
| POST | / | Public |
| GET | / | ADMIN, MANAGER |
| GET | /moyennes | ADMIN, MANAGER |

### Zones (`/api/zones`) — ADMIN
| Méthode | Route |
|---|---|
| GET | / |
| POST | / |
| PATCH | /:id |
| DELETE | /:id |
| POST | /:id/assign-table |
| POST | /:id/unassign-table |

### Printer (`/api/printer`)
| Méthode | Route | Accès |
|---|---|---|
| GET | /config | ADMIN, MANAGER |
| GET | /printers | ADMIN, MANAGER |
| POST | /config | ADMIN, MANAGER |
| POST | /test | ADMIN, MANAGER, CAISSIER |
| POST | /ticket | ADMIN, MANAGER, CAISSIER, RECEPTIONNISTE, SERVEUR, CUISINE, BAR |
| POST | /commande/:id/tickets | ADMIN, MANAGER, CAISSIER, RECEPTIONNISTE, SERVEUR, CUISINE, BAR |
| POST | /facture/:id | ADMIN, MANAGER, CAISSIER |

### 19. Paramètres du restaurant

Accessible depuis **Profil → 🏪 Paramètres du restaurant**.

Trois menus avec navigation par onglets :
- **🏪 Informations** : nom, adresse, téléphone, devise
- **🔒 Clôture Globale** (admin/manager) : statut, date/heure de réouverture
- **🖨️ Imprimante** (admin/manager) : type, IP, port, test d'impression

---

*Documentation mise à jour le 12 juin 2026 — RestoPro v5.0*
