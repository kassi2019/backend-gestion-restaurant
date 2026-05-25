# RestoPro — Documentation Complète

## Parcours Client : De l'Entrée à la Sortie

---

## 1. ARRIVÉE DU CLIENT

### 1.1 Le client scanne le QR Code de la table

Chaque table possède un QR code unique. Le client le scanne avec son téléphone et arrive sur la page :

```
http://192.168.1.7:3000/client.html?tableId=3&restaurantId=1
```

**Ce qui s'affiche :**
- Le nom du restaurant (ex: "🍽 Chez Jean")
- Le numéro de table (ex: "Table 3 • Client CLI-A7B2")
- Le menu complet (catégories : Entrées, Plats, Boissons, Desserts)
- Les prix dans la devise du restaurant (€, FCFA, $...)

### 1.2 Plusieurs personnes à la même table

Chaque personne qui scanne le QR code reçoit un `clientRef` unique (ex: `CLI-A7B2`, `CLI-X9K1`).

> **Exemple** : Table 5, 4 personnes. Chacune scanne le QR code.
> - Personne 1 → CLI-A7B2
> - Personne 2 → CLI-B3M8
> - Personne 3 → CLI-K2P4
> - Personne 4 → CLI-Z1W6
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

Le client appuie sur **🛒 Commander** puis **📤 Confirmer la commande**.

**Ce qui se passe côté backend :**
1. Une **session** est créée (ou réutilisée) pour cette table
2. La commande est créée avec le statut **EN_ATTENTE**
3. Une notification temps réel (toast) est envoyée au **serveur** assigné à cette table
4. Si les articles contiennent des plats CUISINE → notification à l'écran **Cuisine**
5. Si les articles contiennent des boissons BAR → notification à l'écran **Bar**
6. Une notification est sauvegardée en base de données

**Ce que voit le client :**
```
✅ Commande envoyée !
Votre commande a été transmise au serveur.
35.00 €
Le serveur va valider votre commande.
```

---

## 3. TRAITEMENT PAR LE SERVEUR

### 3.1 Le serveur voit les commandes en attente

Le serveur ouvre l'onglet **📋 Commandes** sur son téléphone/tablette.

### 3.2 Le serveur valide la commande

Le serveur appuie sur **✓ Valider**.

**Ce qui se passe :**
1. La commande passe de `EN_ATTENTE` → `VALIDEE`
2. **La table passe automatiquement à OCCUPEE** (si elle ne l'était pas déjà)
3. Un toast temps réel s'affiche sur le téléphone du serveur : *"Table T05 → validée"*
4. Les admins/managers reçoivent aussi la notification

### 3.3 Le cycle de vie de la commande

```
EN_ATTENTE  →  Le client a envoyé sa commande
    │
    ▼ [Serveur : ✓ Valider]
VALIDEE     →  Le serveur a confirmé, la table → OCCUPEE
    │
    ▼ [Cuisine : 👨‍🍳 En préparation]
EN_PREPARATION → Les cuisiniers préparent
    │
    ▼ [Cuisine : ✅ Prête]
PRETE       →  Le plat est prêt à être servi
    │
    ▼ [Serveur : 🍽 Servie]
SERVIE      →  Le plat est servi au client
    │
    ▼ [Caissier : 💰 Payer]
PAYEE       →  Le client a payé
```

**Actions disponibles selon le statut :**

| Statut | Qui peut agir | Action |
|---|---|---|
| EN_ATTENTE | Serveur | ✓ Valider |
| VALIDEE | Cuisine | 👨‍🍳 En préparation |
| EN_PREPARATION | Cuisine | ✅ Prête |
| PRETE | Serveur | 🍽 Servie |
| SERVIE | Caissier | 💰 Payer |

---

## 4. TRAITEMENT PAR LA CUISINE ET LE BAR

### 4.1 La cuisine reçoit les commandes en temps réel

Quand un client passe commande avec des plats de destination **CUISINE** ou **DESSERT**, un toast s'affiche immédiatement sur l'écran cuisine : *"Nouvelle commande • Table T05"*.

Le cuisinier ouvre l'onglet **🍳 Cuisine** (ou **Commandes** selon son rôle) et voit :

```
┌─────────────────────────────────────┐
│ 🍳 Cuisine — Commandes à préparer   │
├─────────────────────────────────────┤
│ Table 5 • 19:30                     │
│  x2 Poulet DG        [EN PRÉPA]    │
│  x1 Salade César     [EN PRÉPA]    │
├─────────────────────────────────────┤
│ Table 2 • 19:35                     │
│  x1 Mafé Viande      [VALIDEE]     │
└─────────────────────────────────────┘
```

### 4.2 Le cuisinier change le statut des plats

1. Le cuisinier sélectionne un plat et appuie sur **👨‍🍳 En préparation** → le détail passe à `EN_PREPARATION`
2. Quand le plat est prêt, il appuie sur **✅ Prête** → le détail passe à `PRET`
3. Un toast s'affiche sur le téléphone du **serveur** : *"Table T05 → prête"*

### 4.3 Le bar fonctionne de la même façon

Même logique pour les boissons (destination **BAR**). Le barman voit uniquement les articles qui le concernent.

### 4.4 Le dashboard de la cuisine

Sur l'écran d'accueil, le cuisinier voit les statistiques du jour :
- ⏳ En attente
- ✅ Validées
- 👨‍🍳 En préparation
- 🍽 Prêtes
- 📋 Servies

> **Note** : La cuisine voit toutes les commandes du restaurant (pas de filtrage par serveur).

---

## 5. PAIEMENT PAR LE CAISSIER

### 5.1 Le caissier voit les commandes à payer

Le caissier ouvre la **Caisse** et voit les commandes prêtes à être payées.

### 5.2 Le caissier encaisse

Le caissier sélectionne la commande et choisit le mode de paiement :
- **Espèces**
- **Mobile Money**
- **Carte Bancaire**

**Ce qui se passe :**
1. La commande passe à `PAYEE`
2. Une **facture** est générée (ex: `FAC-20260526-0003`)
3. Un toast s'affiche sur les écrans admin : *"Paiement reçu table T05 — 35.00 €"*
4. **Vérification** : reste-t-il d'autres commandes non payées sur cette table ?
   - **OUI** → la table reste `OCCUPEE`
   - **NON** → la table passe à `LIBRE`

> **Exemple Table 5** :
> - CLI-A7B2 commande 35.00 € et paie → vérification : CLI-B3M8 a encore une commande non payée → Table 5 reste **OCCUPEE**
> - CLI-B3M8 paie à son tour → vérification : 0 commande active → Table 5 → **LIBRE**

---

## 6. GESTION DES TABLES ET SERVEURS

### 6.1 Affectation des tables aux serveurs

L'admin/manager peut affecter des tables aux serveurs depuis l'écran **Tables** → bouton 👤.

**Mode Affectation** :
1. Sélectionner un serveur
2. Cocher/décocher les tables à lui attribuer
3. Valider → toutes les tables cochées sont assignées au serveur

**Règle métier** : Une table déjà assignée à un serveur aujourd'hui ne peut pas être réassignée directement. Un message d'erreur s'affiche : *"La table est déjà assignée à [Nom] aujourd'hui. Utilisez la réassignation en cas d'absence."*

### 6.2 Transfert en cas d'absence (maladie, imprévu)

Depuis l'écran **Tables** → 👤 → onglet **Transfert (maladie/absence)** :

1. Sélectionner le **serveur absent** (source)
2. Sélectionner le **serveur remplaçant** (cible)
3. Confirmer → toutes les tables du serveur absent sont transférées au remplaçant en une seule opération

### 6.3 Affectation quotidienne automatique

Chaque matin, l'admin/manager peut lancer la **vérification quotidienne** (bouton 🔄 sur l'écran Tables).

**Ce qui se passe :**
1. Le système vérifie le **planning** du jour
2. Les serveurs **absents** sont désactivés, leurs tables libérées
3. Les serveurs **présents** sont activés
4. Les tables libres sont **redistribuées** équitablement aux serveurs actifs

> **Exemple** : Restaurant avec 3 serveurs et 12 tables
> - Lundi : Jean (présent), Marie (présente), Paul (absent)
> - Jean reçoit Tables 1-6, Marie reçoit Tables 7-12
> - Mardi : Jean (absent), Marie (présente), Paul (présent)
> - Marie reçoit Tables 1-6, Paul reçoit Tables 7-12

### 6.4 Le serveur voit uniquement ses tables

Le serveur se connecte → onglet **🪑 Tables** → il voit **uniquement** les tables qui lui sont assignées.

---

## 7. NOTIFICATIONS EN TEMPS RÉEL

### 7.1 Toasts sur l'écran

Dès qu'un événement se produit, un toast (message temporaire) s'affiche sur le téléphone des personnes concernées, **peu importe l'écran où elles se trouvent**.

| Événement | Qui reçoit | Message |
|---|---|---|
| Nouvelle commande client | Serveur assigné | *"Nouvelle commande • Table T05"* |
| Nouvelle commande cuisine | Cuisine | *"Nouvelle commande cuisine"* |
| Nouvelle commande bar | Bar | *"Nouvelle commande bar"* |
| Changement de statut | Serveur + Admins | *"Table T05 → prête"* |
| Paiement reçu | Admins/Managers | *"Paiement reçu table T05 — 35.00 €"* |

### 7.2 Centre de notifications

En plus des toasts temps réel, toutes les notifications sont sauvegardées en base et consultables dans l'onglet **🔔 Notifications** (cloche en haut à droite). On peut les marquer comme lues.

---

## 8. EXEMPLES DE SCÉNARIOS COMPLETS

### Scénario A : Un couple au restaurant

```
19:00  Table 2 LIBRE
       → M. Dupont scanne le QR code (CLI-DP01)
       → Mme Dupont scanne le QR code (CLI-DP02)

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
       → Toast : "Table 2 → servie"

20:00  Les clients demandent l'addition
       → Caissier : 30€ + 26€ = 56€ en Espèces
       → Les 2 commandes → PAYEE
       → Toast admin : "Paiement reçu table 2 — 56.00 €"
       → Vérification : 0 commande active → Table 2 → LIBRE
```

### Scénario B : Deux groupes de clients à la même table

```
18:00  Table 1 LIBRE
       → Groupe A (3 personnes) scanne → session S1
       → Ils commandent pour 45€ → EN_ATTENTE
       → Serveur valide → OCCUPEE
       → Cuisine prépare → sert
       → Ils paient 45€ → PAYEE
       → Vérification : 0 commande active → Table 1 → LIBRE

19:00  Table 1 LIBRE
       → Groupe B (2 personnes) scanne → session S2 (nouvelle)
       → Ils commandent pour 30€ → EN_ATTENTE
       → Serveur valide → OCCUPEE
       → Ils paient 30€ → PAYEE
       → Table 1 → LIBRE

Dans l'historique "Payées" :
┌──────────────────────────────┐
│ Table 1 • 18:00 • 1 cde(s)  │  ← Session S1 (Groupe A)
│ 45.00 €                      │
├──────────────────────────────┤
│ Table 1 • 19:00 • 1 cde(s)  │  ← Session S2 (Groupe B)
│ 30.00 €                      │
└──────────────────────────────┘
```

### Scénario C : Serveur malade — transfert de tables

```
08:00  Planning du jour : Jean, Marie, Paul sont programmés
       → Check automatique : tables réparties

10:00  Jean appelle : il est malade, ne viendra pas
       → Manager ouvre l'écran Tables → 👤 → Transfert
       → Source : Jean Serveur
       → Cible : Marie (qui prendra ses tables)
       → Confirmation : toutes les tables de Jean → Marie
       → Toast : "3 table(s) transférée(s) de Jean Serveur à Marie Cuisine"
```

### Scénario D : Table réservée

```
10:00  Le gérant réserve la Table 8 pour ce soir
       → Table 8 → RESERVEE (manuellement)

19:00  Le client arrive à la Table 8
       → Il scanne le QR code et commande
       → Commande EN_ATTENTE (la table reste RESERVEE)

19:05  Le serveur valide
       → Table 8 → OCCUPEE (écrase le statut RESERVEE)

21:00  Paiement → Table 8 → LIBRE
```

---

## 9. TABLEAU DE BORD (DASHBOARD)

L'écran d'accueil affiche les statistiques du jour en temps réel.

### Pour l'Admin/Manager

**Commandes du jour** (défilables horizontalement) :
- ⏳ En attente
- ✅ Validées
- 👨‍🍳 En préparation
- 🍽 Prêtes
- 📋 Servies

L'admin voit **toutes** les commandes du restaurant.

### Pour le Serveur

Le serveur voit **uniquement ses propres commandes** du jour. Les chiffres sont filtrés automatiquement.

### Pour la Cuisine/Bar

Voient les commandes qui concernent leur destination (CUISINE ou BAR).

---

## 10. PARAMÈTRES DU RESTAURANT

L'admin peut configurer les informations du restaurant depuis **Profil → Paramètres du restaurant** :

- **Nom** du restaurant
- **Adresse**
- **Téléphone**
- **Devise** (€, FCFA, $, etc.) — utilisée partout pour l'affichage des prix

---

## 11. RÉSUMÉ DES ÉTATS

### Statuts de table
```
LIBRE     → Aucun client, disponible
OCCUPEE   → Client(s) présent(s), commande validée
RESERVEE  → Réservée pour plus tard (manuel)
```

### Statuts de commande
```
EN_ATTENTE     → Client a envoyé, en attente de validation
VALIDEE        → Serveur a confirmé
EN_PREPARATION → En cours de préparation en cuisine
PRETE          → Prêt à être servi
SERVIE         → Servi au client
PAYEE          → Payé, facture générée
ANNULEE        → Annulée
```

### Statuts de paiement
```
NON_PAYEE → Pas encore payé
PAYEE     → Payé
```

---

## 12. RÔLES UTILISATEURS

| Rôle | Accès | Actions |
|---|---|---|
| **ADMIN** | Tout | Créer utilisateurs, gérer restaurant, paramétrer devise/téléphone, voir toutes les stats |
| **MANAGER** | Tout | Créer plannings, assigner/transférer tables, voir stats |
| **SERVEUR** | Tables assignées + commandes | Valider/servir commandes, voir ses tables, recevoir toasts temps réel |
| **CUISINE** | Commandes à préparer | Changer statut (EN_PREPA → PRETE), recevoir toasts nouvelles commandes |
| **BAR** | Commandes bar | Même chose pour les boissons |
| **CAISSIER** | Paiements | Encaisser, voir caisse du jour, factures |

---

## 13. FONCTIONNALITÉS COMPLÉMENTAIRES

### Planning des employés
- Admin/Manager crée des plannings pour chaque employé
- Filtre par date et par rôle
- Le planning détermine l'affectation automatique des tables

### Menu et catégories
- Création/modification des plats avec prix, image, temps de préparation
- Catégories avec destination (CUISINE, BAR, DESSERT)
- Ordre de service pour l'affichage
- Activation/désactivation des plats
- Séparateur de milliers sur les prix (ex: 15,000 au lieu de 15000)

### Statistiques
- Chiffre d'affaires du jour
- Plats les plus populaires
- Performance des serveurs
- Taux d'occupation

### Caisse
- Encaissement par mode de paiement (Espèces, Mobile Money, Carte Bancaire)
- Clôture de caisse journalière
- Historique des factures avec filtre par date

### Notifications
- En temps réel via Socket.IO (toasts)
- Centre de notifications avec historique
- Marquage lu/non lu

### Profil utilisateur
- Photo de profil
- Changement de mot de passe
- Mot de passe oublié (réinitialisation par téléphone)

---

*Documentation mise à jour le 25 mai 2026 — RestoPro v1.0*
