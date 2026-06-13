# RestoPro — Guide d'Utilisation

## Table des matières

1. [Démarrage](#1-démarrage)
2. [Connexion](#2-connexion)
3. [Dashboard par Rôle](#3-dashboard-par-rôle)
4. [Commandes](#4-commandes)
5. [Assistant IA](#5-assistant-ia)
6. [Cuisine & Bar](#6-cuisine--bar)
7. [Caisse & Paiement](#7-caisse--paiement)
8. [Remises](#8-remises)
9. [Menu & Variantes](#9-menu--variantes)
10. [Gestion de Stock](#10-gestion-de-stock)
11. [Tables & QR Codes](#11-tables--qr-codes)
12. [Zones Tarifaires](#12-zones-tarifaires)
13. [Affectation des Tables](#13-affectation-des-tables)
14. [Réservations](#14-réservations)
15. [Livraisons](#15-livraisons)
16. [Planning](#16-planning)
17. [Utilisateurs & Modules](#17-utilisateurs--modules)
18. [Abonnement](#18-abonnement)
19. [Super Admin](#19-super-admin)
20. [Impression Thermique](#20-impression-thermique)
21. [Évaluations Clients](#21-évaluations-clients)
22. [Client QR Code](#22-client-qr-code)
23. [Application Web](#23-application-web)
24. [Dépannage](#24-dépannage)

---

## 1. Démarrage

### Installation

```bash
cd gestion-restaurant-api
npm install
```

### Configuration (.env)

```env
DATABASE_URL="mysql://root:P@ssw0rd@localhost:3306/gestion_restaurant"
JWT_SECRET="votre-secret-jwt"
CODE_SECRET="votre-cle-aes-256"
ANTHROPIC_API_KEY="sk-ant-..."
SUPER_ADMIN_IDS=10
PORT=3000
ADRESSE_IP=0.0.0.0    # 0.0.0.0 = automatique, ou mettre l'IP

# Paiement mobile
WAVE_NUMERO="+225 07 00 00 00 00"
OM_NUMERO="+225 01 00 00 00 00"

# Imprimante thermique
PRINTER_TYPE=NETWORK
PRINTER_IP=192.168.1.100
PRINTER_PORT=9100
AUTO_PRINT=true
```

### Base de données

```bash
npx prisma db push
npm run seed
```

### Lancement

```bash
# API
npm run start:dev

# Web
cd ../gestion-restaurant-web
npm run dev

# Mobile
cd ../gestion-resto-mobile
npx expo start
```

### Comptes de test

| Rôle | Téléphone | Mot de passe |
|---|---|---|
| Super Admin | 0999999999 | 123456 |
| Admin | 0990000000 | 123456 |
| Manager | 0990000004 | 123456 |
| Réceptionniste | 0990000005 | 123456 |
| Serveur | 0990000001 | 123456 |
| Cuisine | 0990000002 | 123456 |
| Bar | 0990000003 | 123456 |
| Caissier | 0990000006 | 123456 |
| Livreur | 0990000007 | 123456 |
| **Code activation** | RESTO-TEST-CODE | 30 jours |

---

## 2. Connexion

### Mobile / Web

1. Saisir **téléphone** + **mot de passe**
2. Si abonnement expiré → bouton **Activer** + entrer un code
3. Si mot de passe oublié → **Mot de passe oublié** (réinitialisation par téléphone)

### Conditions
- Compte **ACTIF**
- **Planning du jour** (sauf SUPER_ADMIN, ADMIN, MANAGER, RECEPTIONNISTE)
- **Abonnement** non expiré (sauf SUPER_ADMIN)
- **Restaurant ouvert** (pas de clôture globale en cours)

### Erreurs possibles
- *"Téléphone ou mot de passe incorrect"* → Vérifier les identifiants
- *"Votre compte est inactif"* → Contacter l'admin
- *"Aucun service programmé aujourd'hui"* → Pas de planning
- *"Abonnement expiré"* → Entrer un code d'activation
- *"Le restaurant est fermé"* → Clôture globale en cours

---

## 3. Dashboard par Rôle

Le dashboard s'adapte **automatiquement** au rôle connecté.

### ADMIN / MANAGER
- 4 cartes stats cliquables (Commandes, Tables, Revenus, En attente)
- Accès rapide ⭐ Abonnement / 🔒 Clôture Globale
- Dernières commandes avec statuts
- Accès à tous les modules

### RÉCEPTIONNISTE
- Accueil : commandes en attente, réservations du jour
- Création rapide de commande
- Livraisons à assigner
- Tables et leur statut

### SERVEUR
- Tables assignées (compteur + liste)
- Commandes en cours / Servies aujourd'hui
- Planning du jour

### CUISINE
- Cards : À préparer, En cours, Prêtes
- File FIFO avec temps d'attente par table
- Actions : En préparation, ✅ Prêt, Tout prêt

### BAR
- Identique CUISINE mais pour les boissons uniquement

### CAISSIER
- Caisse du jour (total + détails par mode)
- À payer, Factures, Recherche CMD
- Remises, Caisse directe
- Clôture caissier + Historique

### LIVREUR
- Livraisons actives (toutes)
- Mes livraisons (assignées)
- Mise à jour du statut (En cours → Livrée / Échec)

### SUPER ADMIN
- Stats abonnements (Total restos, En règle, En essai, Expirés)
- Codes d'activation (+ Générer)
- Plans d'abonnement (CRUD)
- Paiements en attente (Confirmer/Rejeter)
- Liste restaurants avec abonnement
- Modules par restaurant

---

## 4. Commandes

### Créer une commande (Web/Mobile)

1. Page **Commandes** → **+ Nouvelle**
2. Sélectionner la table + type (sur place / à emporter)
3. Parcourir les catégories → cliquer sur un plat pour l'ajouter
4. Choisir une variante si disponible
5. Ajuster les quantités dans le panier
6. **✅ Créer la commande**

### Statuts et workflow (Mode SERVEUR)

| Statut | Action | Qui |
|---|---|---|
| EN_ATTENTE | ✓ Valider | SERVEUR |
| VALIDEE | 👨‍🍳 En préparation | CUISINE/BAR |
| EN_PREPARATION | ✅ Prêt (par article) | CUISINE/BAR |
| PRETE | 🍽 Servie | SERVEUR |
| SERVIE | 💰 Payer | CAISSIER |
| PAYEE | — | — |

### Statuts et workflow (Mode RÉCEPTION)

| Statut | Action | Qui |
|---|---|---|
| EN_ATTENTE | ✓ Valider | RÉCEPTIONNISTE |
| RECEPTION_VALIDE | 👨‍🍳 En préparation | CUISINE/BAR |
| EN_PREPARATION | ✅ Prêt (par article) | CUISINE/BAR |
| PRETE | 🍽 Servie | RÉCEPTIONNISTE |
| SERVIE | 💰 Payer | CAISSIER |
| PAYEE | — | — |

### Commandes Comptoir (T00)
- Auto-validées, pas de serveur
- Numéro CMD-XXXX généré
- Notifiées directement en cuisine/bar

### Caisse Directe (Caissier)
1. Page Caisse → **Caisse Directe**
2. Sélectionner les articles → choisir le mode de paiement
3. **✅ Créer et Payer** → commande créée et payée en une étape

---

## 5. Assistant IA

### Commande par texte ou voix

1. Sur la page client QR Code, cliquer sur **🤖 Assistant**
2. Dicter ou taper sa commande (ex: "Je voudrais 2 poulets braisés et un riz gras")
3. L'IA analyse et propose les articles correspondants
4. Vérifier et confirmer → les articles sont ajoutés au panier

### Fonctionnement
- L'IA identifie les plats dans le menu, même avec des variations de nom
- Si un plat n'existe pas, elle propose le plus proche
- Les variantes sont gérées automatiquement
- Les quantités sont détectées dans le message
- Nécessite `ANTHROPIC_API_KEY` dans `.env`

---

## 6. Cuisine & Bar

### Dashboard Cuisine/Bar
Affiché automatiquement selon le rôle. Fonctionnement identique, filtrage par destination (CUISINE ou BAR).

### Actions
- Déplier une table → voir les articles
- **👨‍🍳 En préparation** → change le statut de la commande
- **✅ Prêt** par article → marque un article comme prêt
- **✅ Tout prêt** → tous les articles de la table prêts

### Impression automatique
Si `AUTO_PRINT=true` dans `.env` :
- Ticket imprimé automatiquement à la validation de commande
- Ticket cuisine : tous les articles plat/dessert
- Ticket bar : boissons uniquement

---

## 7. Caisse & Paiement

### Encaisser

1. Onglet 💰 Paiements → sélectionner une commande
2. Appliquer une remise si nécessaire
3. Choisir le mode : 💵 Espèces / 📱 Mobile Money / 💳 Carte
4. **✅ Payer** → le reçu s'affiche

### Recherche par N° commande
Champ 🔍 en haut → taper le numéro CMD-XXXX

### Clôture Caissier (fin de shift)
- **🔒 Clôturer** → enregistre le bilan
- Le caissier ne voit que SES transactions depuis sa dernière clôture
- Le remplaçant démarre avec un dashboard vierge

### Clôture Globale (ADMIN/MANAGER)
- Onglet 📋 Clôtures → historique complet
- Depuis ⭐ Abonnement → 🔒 Clôture Globale
- Définir date/heure de réouverture → ferme tout le restaurant
- Réouverture automatique à l'heure prévue

### Réimpression reçu
Onglet 🧾 Factures → bouton 🖨️ (impression thermique ou HTML)

---

## 8. Remises

### Appliquer une remise

1. Dans la caisse, avant de payer, cliquer sur **% Remise**
2. Choisir le type :
   - **Pourcentage** : ex. 10 pour 10%
   - **Montant fixe** : ex. 500 pour 500 FCFA
3. Saisir un motif (obligatoire)
4. Le montant est recalculé automatiquement

### Traçabilité
- La remise est enregistrée sur la commande et la facture
- Visible dans l'historique des factures

---

## 9. Menu & Variantes

### CRUD Menu
Page 🍽️ Menu (Admin/Manager) :
- **+ Plat** : nom, prix, catégorie, temps de préparation, image, coût matière
- **✏️ Modifier** / **🗑 Supprimer** sur chaque plat
- **✅ Disponible / ❌ Pas disponible** : contrôle visibilité aujourd'hui
- **📅 Disponible demain** : contrôle visibilité pour le jour suivant

### Variantes
Pour les plats avec options (ex: Avec/Sans alcool, Petite/Grande portion) :
- Clic sur **📋 Variantes** → modal
- Ajouter : nom + prix + image
- Supprimer les variantes existantes
- Affichage dans le QR code client avec sélection

### Import CSV
- Bouton **📥 Importer CSV** (web et mobile)
- Format : `nom,prix,categorieId,tempsPreparation,variantes`
- Variantes : `"Avec alcool:4000|Sans alcool:3500"`
- **📄 Modèle** téléchargeable

### Images
- Upload d'image pour chaque plat et variante
- Formats acceptés : JPG, PNG, JPEG
- Stockage dans `/uploads/`

---

## 10. Gestion de Stock

### Principe
| Valeur | Signification |
|---|---|
| **-1** | Illimité |
| **> 0** | Stock disponible |
| **0** | Épuisé → grisé automatiquement |

### Fonctionnement
1. Admin définit le stock initial (ex: Poulet DG → 20)
2. Chaque validation de commande → décrémente automatiquement
3. Stock = 0 → menu grisé automatiquement
4. Réapprovisionnement → dégrisé automatiquement

### Coût matière
- Saisir le coût des matières premières par plat
- Utilisé pour le calcul de la **marge brute** dans les statistiques

### Accès
- **Mobile** : Accueil → 📦 Stock
- **Web** : Menu → onglet Stock
- Filtrage par catégorie
- Modifier le stock ou passer en illimité (∞)

---

## 11. Tables & QR Codes

### Gestion des tables
- Grille visuelle avec statuts colorés
- Filtres par zone et statut
- ✏️ Modifier / 🗑 Supprimer
- **Zone Comptoir** → commandes auto-validées

### QR Codes
- Générés dynamiquement : `/qr-table-{id}.png`
- S'adaptent à l'URL d'accès (`ADRESSE_IP=0.0.0.0` = automatique)
- Imprimer et placer sur les tables
- Page d'administration : `/qrcodes.html`

---

## 12. Zones Tarifaires

### Principe
Chaque table appartient à une zone avec un coefficient de prix :
- **Intérieur** (×1.0) : prix standard
- **Terrasse** (×1.1) : majoration 10%
- **VIP** (×1.3) : majoration 30%
- **Comptoir** (×1.0) : prix standard, commandes auto-validées

### Gestion (Admin)
1. Page 🏷️ Zones
2. Créer/modifier/supprimer des zones
3. Assigner/désassigner des tables à une zone
4. Les prix sont automatiquement ajustés côté client

---

## 13. Affectation des Tables

### Web / Mobile
Page 🔄 Affectation (Admin/Manager/Réceptionniste) :
- Sélectionner un serveur → cocher les tables → **Assigner**
- **✕ Désassigner** : bouton rouge à côté du serveur
- **🔀 Transférer** : toutes les tables d'un serveur → un autre
- **🤖 Vérification journalière** : redistribue automatiquement selon le planning

---

## 14. Réservations

### Créer une réservation
1. Page 📝 Réservations → **+ Nouvelle**
2. Nom du client, téléphone, nombre de personnes
3. Date et heure souhaitées
4. Table (optionnelle)
5. Notes éventuelles

### Gestion
- Statuts : EN_ATTENTE → CONFIRMEE → HONOREE / ANNULEE
- **Honorer** : le client est arrivé → peut créer une commande
- **Annuler** : le client ne vient pas
- Accessible par : Admin, Manager, Réceptionniste

---

## 15. Livraisons

### Cycle de vie

| Statut | Action | Qui |
|---|---|---|
| A_LIVRER | Assigner un livreur | RÉCEPTIONNISTE |
| EN_COURS | Le livreur est en route | LIVREUR |
| LIVREE | Livrée avec succès | LIVREUR |
| ECHEC | Échec de livraison | LIVREUR |

### Gestion par le Réceptionniste
1. Page 🛵 Livraisons → commandes avec type A_EMPORTER
2. Assigner un livreur → définir l'adresse et les frais
3. Suivre le statut en temps réel

### Gestion par le Livreur
1. Voir les livraisons actives
2. Prendre une livraison → statut EN_COURS
3. Livrer → statut LIVREE
4. En cas d'échec → statut ECHEC avec motif

---

## 16. Planning

### Visualisation
- Planning du jour par défaut
- Filtres : date, rôle, employé
- Visible par **tous les rôles** (lecture seule pour non-admin)

### Gestion (Admin/Manager)
- **+ Ajouter** : employé, date, horaires, statut
- ✏️ Modifier / 🗑 Supprimer
- Stats du jour : actifs, absents, congés
- Jours de repos configurables par employé

### Rôles soumis au planning
- SERVEUR, CUISINE, BAR, CAISSIER, LIVREUR
- Non requis : SUPER_ADMIN, ADMIN, MANAGER, RECEPTIONNISTE

---

## 17. Utilisateurs & Modules

### Création
1. Page 👥 Users → **+** (Admin/Manager)
2. Nom, téléphone, mot de passe, rôle
3. Jours de repos (optionnel)
4. **🧩 Modules** : cocher les modules à assigner
5. Photo uploadable

### Modules dynamiques
Chaque utilisateur voit **uniquement** les modules qui lui sont assignés :
- Assignation à la création ou modification
- Bouton 🧩 Modules dans la fiche utilisateur
- L'Admin/Manager ne peut assigner que les modules qu'il possède lui-même
- Module "Générer codes" invisible (SUPER_ADMIN uniquement)
- Navigation web/mobile automatique selon les modules

### Actions
- ✏️ Modifier / 🗑 Supprimer
- 🔒/🔓 Activer/Désactiver/Suspendre
- 📸 Photo de profil

---

## 18. Abonnement

### Fonctionnement
- **Trial 14j** automatique à la création du restaurant
- **MENSUEL** (30j), **TRIMESTRIEL** (90j), **ANNUEL** (365j)
- Codes d'activation chiffrés en AES-256
- Plans avec prix configurés par le Super Admin

### Activation par code
1. Aller dans ⭐ Abonnement (ADMIN)
2. Entrer le code reçu → **Activer**
3. L'abonnement est prolongé, l'historique est enregistré

### Paiement d'abonnement
1. Admin → ⭐ Abonnement → **Payer un abonnement**
2. Choisir un plan → instructions de paiement (Wave/OM)
3. Effectuer le paiement → saisir les infos (nom émetteur, référence)
4. Le Super Admin vérifie et **confirme** ou **rejette**
5. Si confirmé → abonnement prolongé automatiquement

### Notifications automatiques
- > 50% restant → toutes les 24h
- ≤ 50% restant → toutes les 3h
- Tous les utilisateurs du resto sont notifiés

---

## 19. Super Admin

### Accès
- Login avec le compte SUPER_ADMIN
- Protégé par `SUPER_ADMIN_IDS` dans `.env` (seuls les IDs listés passent)
- Le rôle `SUPER_ADMIN` doit être défini dans la base

### Dashboard
- Stats : Total restos, En règle, En essai, Expirés
- Codes : Disponibles, Utilisés, Total
- Restaurants avec abonnement (cliquable → historique)

### Génération de codes
- Page 🔑 Générer codes
- Durées : 30j, 1 an, 2 ans, 3 ans, 4 ans, 5 ans + personnalisé
- Codes chiffrés AES en base
- 👁️ Afficher/Masquer + 🗑 Supprimer
- Tabs : Disponibles / Utilisés

### Gestion des plans d'abonnement
- Page 💳 Plans → CRUD complet
- Nom, durée (jours), prix, actif/inactif
- Les plans inactifs n'apparaissent pas aux restaurants

### Validation des paiements
- Page 💰 Paiements en attente
- Voir les infos de paiement soumises par le resto
- **✅ Confirmer** → abonnement prolongé
- **❌ Rejeter** → motif + notification au resto

### Modules par restaurant
- Définir les modules disponibles pour chaque restaurant
- Les utilisateurs de ce resto ne peuvent voir que ces modules
- Les modules retirés sont automatiquement désassignés des utilisateurs

---

## 20. Impression Thermique

### Configuration (.env)

```env
# Type d'imprimante : WINDOWS, NETWORK, ou USB
PRINTER_TYPE=NETWORK

# Pour NETWORK
PRINTER_IP=192.168.1.100
PRINTER_PORT=9100

# Pour WINDOWS
PRINTER_NAME=POS-80C
PRINTER_SHARE=\\PC\Imprimante

# Pour USB
# PRINTER_TYPE=USB

# Général
PRINTER_CHAR_WIDTH=42
AUTO_PRINT=true
```

### Tickets disponibles

| Type | Quand | Contenu |
|------|-------|---------|
| Ticket cuisine | Auto (si AUTO_PRINT) ou manuel | Table, articles cuisine, heure |
| Ticket bar | Auto (si AUTO_PRINT) ou manuel | Table, boissons, heure |
| Ticket commande | Manuel | Détail complet de la commande |
| Reçu caisse | Après paiement | Articles, total, mode de paiement |

### Test d'impression
1. Page 🖨️ Imprimante (Admin/Manager)
2. Vérifier la configuration
3. Cliquer sur **🧪 Test** → un ticket test s'imprime

### Dépannage imprimante
- **NETWORK** : vérifier que l'imprimante est allumée et connectée au réseau
- **WINDOWS** : le service doit tourner sur Windows (pas de support Linux/Mac)
- **USB** : vérifier le port dans le gestionnaire de périphériques
- Vérifier `PRINTER_PORT` (généralement 9100 pour réseau)

---

## 21. Évaluations Clients

### Fonctionnement
Après leur repas, les clients peuvent noter le restaurant :
- **Service** : ⭐ 1 à 5
- **Cuisine** : ⭐ 1 à 5
- **Ambiance** : ⭐ 1 à 5
- **Commentaire** (optionnel)

### Consultation (Admin/Manager)
- Page ⭐ Évaluations → liste des évaluations
- **Moyennes** : scores moyens par catégorie
- Filtrage par date

---

## 22. Client QR Code

### Commande classique
1. Scanner le QR code → page menu
2. Parcourir → cliquer **+** pour ajouter
3. Variantes : choisir l'option → sélectionner
4. Plats indisponibles : grisés, non commandables
5. Panier → ajuster quantités → **Commander**
6. Confirmation avec numéro de suivi

### Assistant IA
1. Cliquer sur **🤖 Assistant**
2. Dicter ou taper sa commande
3. L'IA propose les articles → confirmer
4. Les articles sont ajoutés au panier

### À emporter (T00)
- Scanner le QR comptoir → commander
- **CMD-XXXX** affiché → donner à la caisse

### Suivi
- Statut en temps réel via Socket.IO
- Bouton **🧾 Demander l'addition** quand SERViE
- Annulation possible tant que EN_ATTENTE
- **Device ID** : les commandes survivent au changement de navigateur

---

## 23. Application Web

Disponible sur `http://localhost:5173` (dev) ou via le build.

### Fonctionnalités
- 🏠 Dashboard par rôle
- 🪑 Tables (grille + gestion)
- 📋 Commandes (création + suivi + assistant IA)
- 🍽️ Menu (CRUD + variantes + images + CSV)
- 🏷️ Zones (tarifs par zone)
- 🖨️ Imprimante (config + test + tickets)
- 📦 Stock (gestion par catégorie)
- 🔄 Affectation (tables → serveurs)
- 📝 Réservations (création + suivi)
- 🛵 Livraisons (assignation + suivi)
- 📅 Planning (vue journalière)
- 💰 Caisse (paiement + remises + factures + clôtures)
- 👥 Users (création + modules + photo)
- 📊 Stats (dashboard, ventes, plats, serveurs, marge)
- ⭐ Évaluations (notes clients)
- 🔔 Notifications (temps réel + badge)
- ⭐ Abonnement (activation + paiement + clôture globale)

### Temps réel
- Socket.IO : commandes, statuts, notifications
- Badge compteur sur la sidebar
- Sonnerie audio
- Mise à jour instantanée des statuts

### Mode hors-ligne
- Bandeau rouge si connexion perdue
- Commandes sauvegardées en local
- Synchronisation automatique au retour

### Application Mobile
Disponible via Expo (React Native) :
- Mêmes fonctionnalités que le web
- Notifications push + vibration
- Appareil photo pour les menus et profils
- Interface tactile optimisée

---

## 24. Dépannage

### Le QR code ne s'ouvre pas
- Vérifier `ADRESSE_IP` dans `.env`
- `0.0.0.0` = détection automatique (recommandé)
- Redémarrer le serveur après modification
- Vérifier que le port 3000 est ouvert dans le pare-feu

### Le dashboard cuisine/bar est vide
- Vérifier que des commandes validées existent
- Le serveur ou le réceptionniste doit d'abord **valider** la commande
- Vérifier que la commande contient des articles cuisine/bar

### La caisse affiche 0.00 €
- Normal si nouveau caissier ou après clôture
- Vérifier que des paiements ont été effectués
- Admin/Manager voient toutes les transactions

### Impossible de se connecter
- Vérifier le statut (ACTIF)
- Vérifier le planning du jour (sauf Admin/Manager/Réceptionniste)
- Vérifier l'abonnement (pas expiré)
- Vérifier que le resto n'est pas fermé (clôture globale)
- Essayer "Mot de passe oublié"

### Token expiré / déconnecté
- Le JWT expire après 12h → se reconnecter

### Droits d'accès (403 Forbidden)
- Vérifier que le rôle a bien le module assigné
- SUPER_ADMIN : vérifier `SUPER_ADMIN_IDS` dans `.env`
- Vérifier que le module est activé pour le restaurant

### L'impression ne fonctionne pas
- **NETWORK** : vérifier IP et port → tester avec `ping`
- **WINDOWS** : l'API doit tourner sous Windows
- Faire un test d'impression depuis l'interface admin
- Vérifier que l'imprimante est sous tension et connectée

### L'assistant IA ne répond pas
- Vérifier `ANTHROPIC_API_KEY` dans `.env`
- Vérifier la connexion internet
- L'assistant fonctionne en mode dégradé (message d'indisponibilité)

### Erreur "Rendered fewer hooks" (mobile)
- Redémarrer l'app
- Bug connu lié à React Native, corrigé dans les versions récentes

### Les variantes n'apparaissent pas
- Vérifier que le plat a bien des variantes créées
- Les variantes apparaissent uniquement si le plat en a au moins une

### Les modules n'apparaissent pas dans la navigation
- Vérifier que les modules sont bien assignés à l'utilisateur
- Vérifier que les modules sont activés pour le restaurant (Super Admin)
- Se reconnecter pour rafraîchir les modules

---

*Guide d'Utilisation — RestoPro v5.0 — Juin 2026*
