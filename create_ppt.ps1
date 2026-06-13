Add-Type -AssemblyName System.Drawing

$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = $false

$presentation = $ppt.Presentations.Add()
$sw = $presentation.PageSetup.SlideWidth
$sh = $presentation.PageSetup.SlideHeight

# Couleurs
$cBleu   = [System.Drawing.ColorTranslator]::FromHtml("#1B3A5C")
$cBleuM  = [System.Drawing.ColorTranslator]::FromHtml("#2C5F8A")
$cOrange = [System.Drawing.ColorTranslator]::FromHtml("#E87722")
$cBlanc  = [System.Drawing.ColorTranslator]::FromHtml("#FFFFFF")
$cNoir   = [System.Drawing.ColorTranslator]::FromHtml("#2D3748")
$cGrisC  = [System.Drawing.ColorTranslator]::FromHtml("#F7FAFC")
$cGris   = [System.Drawing.ColorTranslator]::FromHtml("#718096")
$cVert   = [System.Drawing.ColorTranslator]::FromHtml("#38A169")
$cRouge  = [System.Drawing.ColorTranslator]::FromHtml("#E53E3E")
$cJaune  = [System.Drawing.ColorTranslator]::FromHtml("#D69E2E")
$cViolet = [System.Drawing.ColorTranslator]::FromHtml("#805AD5")
$cGrisL  = [System.Drawing.ColorTranslator]::FromHtml("#E2E8F0")

function rgb($c) { return $c.R -bor ($c.G -shl 8) -bor ($c.B -shl 16) }

function Rect($s, $c, $l, $t, $w, $h) {
    $r = $s.Shapes.AddShape(1, $l, $t, $w, $h)
    $r.Fill.ForeColor.RGB = rgb $c
    $r.Line.Visible = $false
    return $r
}

function Txt($s, $text, $l, $t, $w, $h, $fs, $c, $b, $a) {
    $tb = $s.Shapes.AddTextbox(1, $l, $t, $w, $h)
    $tb.TextFrame.TextRange.Text = $text
    $tb.TextFrame.TextRange.Font.Size = $fs
    $tb.TextFrame.TextRange.Font.Color.RGB = rgb $c
    $tb.TextFrame.TextRange.Font.Bold = $b
    $tb.TextFrame.TextRange.ParagraphFormat.Alignment = $a
    $tb.TextFrame.WordWrap = $true
    $tb.Fill.Visible = $false
    $tb.Line.Visible = $false
    return $tb
}

function Accent($s, $l, $t, $w, $c) {
    $r = $s.Shapes.AddShape(1, $l, $t, $w, 4)
    $r.Fill.ForeColor.RGB = rgb $c
    $r.Line.Visible = $false
}

function Header($s, $title) {
    Rect $s $cBleu 0 0 $sw 100
    Txt $s $title 50 20 800 60 36 $cBlanc $true 1
}

function Card($s, $l, $t, $w, $h, $bg, $icon, $title, $desc) {
    $card = Rect $s $bg $l $t $w $h
    $card.Shadow.Type = 1
    $card.Shadow.OffsetX = 2
    $card.Shadow.OffsetY = 2
    $card.Shadow.Transparency = 0.7
    Txt $s $icon ($l+10) ($t+10) 40 40 24 $cBlanc $true 1
    Txt $s $title ($l+10) ($t+55) ($w-20) 30 14 $cBlanc $true 1
    Txt $s $desc ($l+10) ($t+85) ($w-20) ($h-95) 11 $cBlanc $false 1
}

# ==================== SLIDE 1 - TITRE ====================
$s1 = $presentation.Slides.Add(1, 1)
Rect $s1 $cBleu 0 0 $sw $sh
Rect $s1 $cOrange 50 250 500 6
Txt $s1 "RestoPro" 50 100 800 100 56 $cBlanc $true 1
Txt $s1 "Systeme de Gestion de Restaurant" 50 270 800 50 28 $cBlanc $false 1
Txt $s1 "Commande par QR Code . Assistant IA . Temps Reel . Gestion Complete" 50 330 800 40 16 $cOrange $false 1
Txt $s1 "v5.0 -- Juin 2026" 50 400 800 30 13 $cGris $false 1
Txt $s1 "NestJS  |  MySQL  |  Socket.IO  |  Claude AI  |  React  |  React Native" 50 460 800 30 13 $cGris $false 1

# ==================== SLIDE 2 - SOMMAIRE ====================
$s2 = $presentation.Slides.Add(1, 1)
Rect $s2 $cGrisC 0 0 $sw $sh
Header $s2 "Sommaire"

$items = @(
    "1.  Vue d'ensemble du projet",
    "2.  Stack technique",
    "3.  Fonctionnalites principales",
    "4.  Roles utilisateurs",
    "5.  Parcours client (QR Code)",
    "6.  Cycle de vie d'une commande",
    "7.  Dashboards cuisine et bar",
    "8.  Caisse et Paiements",
    "9.  Assistant IA (Claude)",
    "10. Notifications temps reel",
    "11. Abonnement et Monetisation",
    "12. Architecture globale",
    "13. Statistiques et Analytics",
    "14. Projets complementaires"
)
for ($i=0; $i -lt $items.Count; $i++) {
    Txt $s2 $items[$i] 80 (140+$i*28) 700 26 16 $cNoir ($i -lt 3) 1
}

# ==================== SLIDE 3 - VUE D'ENSEMBLE ====================
$s3 = $presentation.Slides.Add(1, 1)
Rect $s3 $cGrisC 0 0 $sw $sh
Header $s3 "Vue d'Ensemble"
Txt $s3 "RestoPro est une solution complete de gestion de restaurant qui digitalise l'ensemble du parcours client -- de la commande au paiement -- grace aux QR codes, a l'intelligence artificielle et aux notifications en temps reel." 50 130 860 70 15 $cNoir $false 1

Card $s3 50 220 200 150 $cBleuM  "[ ]" "QR Code" "Chaque table possede un QR code unique. Le client scanne, consulte le menu et commande directement depuis son telephone."
Card $s3 270 220 200 150 $cOrange "[ ]" "Assistant IA" "Commande par texte ou par voix. L'IA Claude analyse et trouve les plats correspondants dans le menu."
Card $s3 490 220 200 150 $cVert  "[ ]" "Temps Reel" "Socket.IO avec toasts, sons et vibrations. Tous les acteurs sont notifies instantanement."
Card $s3 710 220 200 150 $cViolet "[ ]" "Multi-plateforme" "API NestJS + Web React + Mobile React Native. Une experience unifiee sur tous les appareils."

Txt $s3 "9 roles utilisateurs   |   18 modules fonctionnels   |   3 modes de commande   |   3 types d'imprimantes" 50 400 860 30 14 $cBleu $true 1

# ==================== SLIDE 4 - STACK TECHNIQUE ====================
$s4 = $presentation.Slides.Add(1, 1)
Rect $s4 $cGrisC 0 0 $sw $sh
Header $s4 "Stack Technique"

$techs = @(
    @("Framework Backend",    "NestJS 10",           "Architecture modulaire TypeScript"),
    @("Base de donnees",      "MySQL 8 + Prisma 4",  "ORM type-safe, migrations, seeding"),
    @("Temps reel",           "Socket.IO 4",         "Notifications instantanees multi-canaux"),
    @("Authentification",     "JWT + Passport + Bcrypt", "Tokens 12h, roles, guards"),
    @("Intelligence Artificielle", "Claude (Anthropic SDK)", "Commande vocale/textuelle"),
    @("QR Codes",             "qrcode (npm)",        "Generation dynamique par table"),
    @("Frontend Web",         "React + Vite",        "Dashboard administrateur complet"),
    @("Frontend Mobile",      "React Native + Expo", "Notifications push + vibration"),
    @("Impression",           "ESC/POS Thermal",     "Tickets cuisine, bar, recus caisse"),
    @("Paiement",             "Wave + Orange Money", "Instructions de paiement mobile")
)

for ($i=0; $i -lt $techs.Count; $i++) {
    $y = 130 + $i * 41
    $bg = if ($i % 2 -eq 0) { $cGrisL } else { $cBlanc }
    Rect $s4 $bg 50 $y 860 38
    Txt $s4 $techs[$i][0] 60 ($y+5) 220 30 14 $cBleu $true 1
    Txt $s4 $techs[$i][1] 290 ($y+5) 260 30 14 $cOrange $true 1
    Txt $s4 $techs[$i][2] 560 ($y+5) 340 30 13 $cGris $false 1
}

# ==================== SLIDE 5 - FONCTIONNALITES ====================
$s5 = $presentation.Slides.Add(1, 1)
Rect $s5 $cGrisC 0 0 $sw $sh
Header $s5 "Fonctionnalites Principales"

$feats = @(
    "[Client] Commande par scan QR code -- chaque table a son QR unique",
    "[IA] Assistant IA de commande -- commandez par texte ou par voix avec Claude",
    "[Cuisine] Dashboard Cuisine FIFO -- timer, code couleur, actions par article/table",
    "[Bar] Dashboard Bar dedie -- filtrage automatique des boissons",
    "[Caisse] Caisse complete -- recherche par CMD, remises, factures, cloture caissier",
    "[Livraison] Gestion des livraisons -- assignation, suivi, statuts livreur",
    "[Reservation] Reservations de tables -- confirmation, honoree, annulation",
    "[Zones] Zones tarifaires -- coefficients de prix par zone (Terrasse, VIP, etc.)",
    "[Menu] Variantes de menu -- options avec prix distincts (avec/sans alcool)",
    "[Stock] Gestion de stock -- decrementation auto, indisponibilite automatique",
    "[Impression] Impression thermique ESC/POS -- tickets cuisine/bar et recus caisse",
    "[Stats] Statistiques avancees -- CA, panier moyen, plats populaires, marge brute",
    "[Securite] Cloture caissier et cloture globale -- reouverture automatique",
    "[Evaluation] Evaluations clients -- service, cuisine, ambiance (1 a 5 etoiles)",
    "[Abonnement] Abonnement -- trial 14j, plans mensuels/trimestriels/annuels, codes AES",
    "[Modules] Modules dynamiques -- visibilite personnalisee par utilisateur",
    "[Planning] Planning employes -- verification quotidienne a la connexion",
    "[Reception] Mode Reception -- alternative au mode serveur classique"
)

for ($i=0; $i -lt $feats.Count; $i++) {
    $col = [Math]::Floor($i / 9)
    $row = $i % 9
    $x = 50 + $col * 470
    $y = 130 + $row * 42
    $accent = if ($col -eq 0) { $cBleuM } else { $cOrange }
    Txt $s5 $feats[$i] $x $y 450 40 12 $cNoir $false 1
    Accent $s5 $x ($y+36) 30 $accent
}

# ==================== SLIDE 6 - ROLES ====================
$s6 = $presentation.Slides.Add(1, 1)
Rect $s6 $cGrisC 0 0 $sw $sh
Header $s6 "Roles et Permissions"

$roles = @(
    @("SUPER ADMIN",     "Supervision globale. Abonnements, plans, codes, modules par restaurant.", $cRouge),
    @("ADMIN",           "Gestion complete du restaurant. Zones, cloture globale, parametres, stats.", $cOrange),
    @("MANAGER",         "Plannings, affectations, statistiques, menus, gestion des utilisateurs.", $cJaune),
    @("RECEPTIONNISTE",  "Accueil, creation de commandes, reservations, livraisons, affectations.", $cVert),
    @("SERVEUR",         "Valider les commandes, servir, voir uniquement ses tables et commandes.", $cBleuM),
    @("CUISINE",         "Dashboard FIFO avec timer. Mise en preparation, articles prets, Tout pret.", $cViolet),
    @("BAR",             "Dashboard FIFO identique cuisine mais filtre sur les boissons uniquement.", $cViolet),
    @("CAISSIER",        "Encaissement, remises, factures, recherche CMD, cloture caissier.", $cNoir),
    @("LIVREUR",         "Voit les livraisons a effectuer, met a jour le statut (En cours, Livree).", $cGris)
)

for ($i=0; $i -lt $roles.Count; $i++) {
    $y = 120 + $i * 50
    Rect $s6 $cBlanc 50 $y 860 45
    Accent $s6 50 $y 6 $roles[$i][2]
    Txt $s6 $roles[$i][0] 70 ($y+5) 180 35 14 $roles[$i][2] $true 1
    Txt $s6 $roles[$i][1] 260 ($y+5) 640 35 12 $cNoir $false 1
}

# ==================== SLIDE 7 - PARCOURS CLIENT ====================
$s7 = $presentation.Slides.Add(1, 1)
Rect $s7 $cGrisC 0 0 $sw $sh
Header $s7 "Parcours Client -- QR Code"

$steps = @(
    @("1", "Scan", "Le client scanne`rle QR code sur`rsa table", $cBleuM),
    @("2", "Menu", "Le menu s'affiche`ravec prix et`rvariantes", $cOrange),
    @("3", "Commande", "Ajout au panier`rpuis validation`ret confirmation", $cVert),
    @("4", "Suivi", "Statut en temps reel`rvia Socket.IO`rsur son telephone", $cViolet),
    @("5", "Addition", "Demande d'addition`rquand la commande`rest servie", $cBleu)
)

for ($i=0; $i -lt $steps.Count; $i++) {
    $x = 50 + $i * 180
    $circ = $s7.Shapes.AddShape(9, $x+55, 150, 70, 70)
    $circ.Fill.ForeColor.RGB = rgb $steps[$i][4]
    $circ.Line.Visible = $false
    $circ.TextFrame.TextRange.Text = $steps[$i][0]
    $circ.TextFrame.TextRange.Font.Size = 28
    $circ.TextFrame.TextRange.Font.Bold = $true
    $circ.TextFrame.TextRange.Font.Color.RGB = 0xFFFFFF
    $circ.TextFrame.TextRange.ParagraphFormat.Alignment = 2

    if ($i -lt $steps.Count - 1) {
        Txt $s7 "-->" ($x+130) 165 40 40 24 $cGris $true 2
    }
    Txt $s7 $steps[$i][1] $x 240 150 30 16 $steps[$i][4] $true 2
    Txt $s7 ($steps[$i][2] -replace '`r', "`r") $x 270 150 50 12 $cNoir $false 2
}

Rect $s7 $cBlanc 50 340 860 130
Txt $s7 "Points cles" 70 350 200 25 15 $cBleu $true 1
$pts = @(
    "- Restauration automatique de session (localStorage, 6h)",
    "- Device ID : suivi cross-appareil sans authentification",
    "- Commandes a emporter (Comptoir/T00) : auto-validees, numero CMD-XXXX",
    "- Restaurant ferme (cloture globale) : message rouge, menu masque, reouverture auto"
)
for ($i=0; $i -lt $pts.Count; $i++) {
    Txt $s7 $pts[$i] 70 (380+$i*23) 820 22 13 $cNoir $false 1
}

# ==================== SLIDE 8 - CYCLE DE VIE COMMANDE ====================
$s8 = $presentation.Slides.Add(1, 1)
Rect $s8 $cGrisC 0 0 $sw $sh
Header $s8 "Cycle de Vie d'une Commande"

Txt $s8 "Mode SERVEUR (classique)" 50 120 400 35 20 $cBleuM $true 1

$wf = @(
    @("EN_ATTENTE", "Valider", "SERVEUR", $cJaune),
    @("VALIDEE", "En prepa", "CUISINE/BAR", $cOrange),
    @("EN_PREPARATION", "Pret article", "CUISINE/BAR", $cBleuM),
    @("PRETE (auto)", "Servir", "SERVEUR", $cVert),
    @("SERVIE", "Payer", "CAISSIER", $cViolet),
    @("PAYEE", "--", "--", $cGris)
)

for ($i=0; $i -lt $wf.Count; $i++) {
    $x = 50 + $i * 155
    Rect $s8 $cBlanc $x 165 145 65
    Accent $s8 $x 165 145 $wf[$i][3]
    Txt $s8 $wf[$i][0] ($x+5) 168 135 22 11 $wf[$i][3] $true 2
    Txt $s8 $wf[$i][1] ($x+5) 192 135 18 10 $cNoir $false 2
    Txt $s8 $wf[$i][2] ($x+5) 212 135 18 9 $cGris $false 2
    if ($i -lt $wf.Count - 1) {
        Txt $s8 "-->" ($x+138) 185 20 30 16 $cGris $true 2
    }
}

Txt $s8 "Mode RECEPTION (sans serveur dedie)" 50 260 400 35 20 $cOrange $true 1
Txt $s8 "EN_ATTENTE --> RECEPTION_VALIDE --> EN_PREPARATION --> PRETE --> SERVIE --> PAYEE" 50 300 860 25 13 $cNoir $false 1
Txt $s8 "Le Receptionniste remplace le Serveur pour la validation et le service." 50 325 860 25 12 $cGris $false 1

Txt $s8 "Regles metier importantes" 50 370 300 25 15 $cBleu $true 1
$regles = @(
    "- PRETE : transition automatique quand TOUS les articles (cuisine + bar) sont prets",
    "- Table --> OCCUPEE a la validation, --> LIBRE automatiquement apres paiement",
    "- Annulation possible uniquement au statut EN_ATTENTE (client ou staff)",
    "- Double suivi : statut global commande + statut individuel par article"
)
for ($i=0; $i -lt $regles.Count; $i++) {
    Txt $s8 $regles[$i] 50 (395+$i*23) 860 22 13 $cNoir $false 1
}

# ==================== SLIDE 9 - DASHBOARD CUISINE & BAR ====================
$s9 = $presentation.Slides.Add(1, 1)
Rect $s9 $cGrisC 0 0 $sw $sh
Header $s9 "Dashboards Cuisine et Bar"

Rect $s9 $cBlanc 50 120 410 230
Accent $s9 50 120 410 $cOrange
Txt $s9 "Dashboard Cuisine" 70 130 370 30 20 $cOrange $true 1

$cu = @(
    "- Stats en temps reel : A preparer / En cours / Pretes",
    "- Tri FIFO : les commandes les plus anciennes en haut",
    "- Timer : minutes d'attente depuis la validation",
    "- ROUGE >15min / JAUNE 5-15min / VERT <5min",
    "- Actions : 'En preparation' par commande, 'Pret' par article",
    "- Bouton 'Tout pret' pour une table entiere",
    "- Montants affiches : total cuisine/dessert uniquement",
    "- Impression automatique du ticket cuisine (AUTO_PRINT)"
)
for ($i=0; $i -lt $cu.Count; $i++) {
    Txt $s9 $cu[$i] 70 (170+$i*24) 380 22 12 $cNoir $false 1
}

Rect $s9 $cBlanc 490 120 420 230
Accent $s9 490 120 420 $cViolet
Txt $s9 "Dashboard Bar" 510 130 370 30 20 $cViolet $true 1

$bar = @(
    "- Meme interface que la Cuisine",
    "- Filtrage automatique : boissons uniquement",
    "- Montants affiches : total bar uniquement",
    "- Independant de la cuisine -- workflow parallele",
    "- Un article bar peut etre pret avant les plats",
    "- La commande passe PRETE quand TOUT est pret",
    "- Impression automatique du ticket bar (AUTO_PRINT)",
    "- Notifications en temps reel a la validation"
)
for ($i=0; $i -lt $bar.Count; $i++) {
    Txt $s9 $bar[$i] 510 (170+$i*24) 380 22 12 $cNoir $false 1
}

Txt $s9 "Les dashboards sont independants : la cuisine et le bar travaillent en parallele sur la meme commande." 50 370 860 30 13 $cBleu $false 1

# ==================== SLIDE 10 - CAISSE & PAIEMENTS ====================
$s10 = $presentation.Slides.Add(1, 1)
Rect $s10 $cGrisC 0 0 $sw $sh
Header $s10 "Caisse et Paiements"

Rect $s10 $cBlanc 50 120 420 330
Accent $s10 50 120 420 $cVert
Txt $s10 "Fonctionnalites Caisse" 70 130 380 30 18 $cVert $true 1

$ca = @(
    "- Recherche rapide par numero CMD-XXXX",
    "- Remises : pourcentage (%) ou montant fixe",
    "- Facture automatique FAC-AAAAMMJJ-XXXX",
    "- Recu : apercu puis impression thermique ou HTML",
    "- 3 modes de paiement : Especes, Mobile Money, CB",
    "- Cloture caissier (fin de shift) : bilan individuel",
    "- Cloture globale (admin) : fermeture restaurant",
    "- Reouverture automatique a la date/heure programmee",
    "- Historique complet avec reimpression",
    "- Caisse directe : commande + paiement en une etape"
)
for ($i=0; $i -lt $ca.Count; $i++) {
    Txt $s10 $ca[$i] 70 (165+$i*26) 380 25 12 $cNoir $false 1
}

Rect $s10 $cBlanc 490 120 420 330
Accent $s10 490 120 420 $cBleuM
Txt $s10 "Securite et Tracabilite" 510 130 380 30 18 $cBleuM $true 1

$se = @(
    "- Chaque caissier ne voit que SES transactions",
    "- Cloture caissier : depart --> dashboard a zero",
    "- Remises avec MOTIF OBLIGATOIRE pour tracabilite",
    "- Factures horodatees avec numero unique",
    "- Token JWT dans l'URL pour l'impression des recus",
    "- Historique des clotures consultable (admin/manager)",
    "- Restaurant ferme : message rouge cote client",
    "- Aucune commande possible pendant la fermeture",
    "- Reouverture automatique : commandes de nouveau possibles",
    "- API protegee par guards de roles a chaque endpoint"
)
for ($i=0; $i -lt $se.Count; $i++) {
    Txt $s10 $se[$i] 510 (165+$i*26) 380 25 12 $cNoir $false 1
}

# ==================== SLIDE 11 - ASSISTANT IA ====================
$s11 = $presentation.Slides.Add(1, 1)
Rect $s11 $cGrisC 0 0 $sw $sh
Header $s11 "Assistant IA -- Claude (Anthropic)"

Txt $s11 "Le client peut commander par texte ou par voix. L'IA Claude analyse le message et retrouve les plats correspondants dans le menu du restaurant." 50 130 860 50 15 $cNoir $false 1

Rect $s11 $cBlanc 50 190 860 200
Txt $s11 "Comment ca marche ?" 70 200 400 30 18 $cBleuM $true 1
$ia = @(
    "1. Le client dicte ou tape : 'Je voudrais 2 poulets braises et un riz gras'",
    "2. L'API envoie le message + le menu complet a Claude via l'Anthropic SDK",
    "3. Claude analyse et identifie les plats (meme avec des variations de nom)",
    "4. Les articles sont retournes avec prix, quantites et variantes detectees",
    "5. Le client verifie et confirme --> les articles sont ajoutes au panier",
    "6. Si un plat n'existe pas, Claude propose le plus proche"
)
for ($i=0; $i -lt $ia.Count; $i++) {
    Txt $s11 $ia[$i] 70 (235+$i*25) 820 24 13 $cNoir $false 1
}

Txt $s11 "Avantages concurrentiels" 70 410 300 30 18 $cOrange $true 1
$av = @(
    "[Voix] Commande vocale : le client parle, l'IA comprend",
    "[IA] Comprehension contextuelle : 'la meme chose' = repete la derniere commande",
    "[Langue] Multilingue : comprend le francais, les expressions locales",
    "[Vitesse] Instantane : reponse en < 2 secondes, l'experience est fluide"
)
for ($i=0; $i -lt $av.Count; $i++) {
    Txt $s11 $av[$i] 70 (440+$i*28) 400 26 13 $cNoir $false 1
}

# ==================== SLIDE 12 - NOTIFICATIONS ====================
$s12 = $presentation.Slides.Add(1, 1)
Rect $s12 $cGrisC 0 0 $sw $sh
Header $s12 "Notifications Temps Reel"

Txt $s12 "Canaux de notification" 50 130 300 30 18 $cBleuM $true 1

$ch = @(
    @("Toasts visuels", "react-native-toast-message", "Design 3D avec animations"),
    @("Son", "expo-av (WAV)", "Bip sonore a chaque evenement"),
    @("Vibration", "React Native Vibration", "Retour haptique sur mobile"),
    @("Socket.IO", "WebSocket temps reel", "Connexion persistante bidirectionnelle"),
    @("Badge compteur", "Sidebar + Tab bar", "Nombre de notifications en attente")
)
for ($i=0; $i -lt $ch.Count; $i++) {
    Txt $s12 ($ch[$i][0] + " -- " + $ch[$i][1]) 50 (165+$i*28) 420 26 13 $cNoir $true 1
    Txt $s12 $ch[$i][2] 50 (185+$i*28) 420 20 11 $cGris $false 1
}

Txt $s12 "Evenements Socket.IO" 500 130 400 30 18 $cOrange $true 1

$ev = @(
    @("nouvelle_commande", "Serveur / Receptionniste"),
    @("nouvelle_commande_cuisine", "Cuisine"),
    @("nouvelle_commande_bar", "Bar"),
    @("commande_status_change", "Serveur + Admin + Reception"),
    @("commande_pret", "Serveur + Admin + Reception"),
    @("demande_facture", "Serveur + Admin"),
    @("nouvelle_livraison", "Livreurs"),
    @("livraison_assignee", "Livreur specifique"),
    @("commande_status", "Client (table)")
)
for ($i=0; $i -lt $ev.Count; $i++) {
    Rect $s12 ([System.Drawing.ColorTranslator]::FromHtml("#EDF2F7")) 500 (165+$i*28) 410 26
    Txt $s12 $ev[$i][0] 505 (168+$i*28) 220 24 11 $cBleu $false 1
    Txt $s12 ("--> " + $ev[$i][1]) 505 (168+$i*28) 200 24 11 $cGris $false 3
}

# ==================== SLIDE 13 - ABONNEMENT ====================
$s13 = $presentation.Slides.Add(1, 1)
Rect $s13 $cGrisC 0 0 $sw $sh
Header $s13 "Abonnement et Monetisation"

Rect $s13 $cBlanc 50 120 420 150
Accent $s13 50 120 420 $cVert
Txt $s13 "Trial Gratuit" 70 130 380 30 18 $cVert $true 1
$tr = @(
    "- 14 jours d'essai automatique a la creation du restaurant",
    "- Toutes les fonctionnalites disponibles",
    "- Aucune carte bancaire requise",
    "- Expiration --> l'admin doit activer un abonnement"
)
for ($i=0; $i -lt $tr.Count; $i++) { Txt $s13 $tr[$i] 70 (168+$i*24) 380 22 13 $cNoir $false 1 }

Rect $s13 $cBlanc 490 120 420 150
Accent $s13 490 120 420 $cOrange
Txt $s13 "Plans d'Abonnement" 510 130 380 30 18 $cOrange $true 1
$pl = @(
    "- MENSUEL : 30 jours -- ideal pour tester",
    "- TRIMESTRIEL : 90 jours -- rapport qualite/prix",
    "- ANNUEL : 365 jours -- meilleure valeur",
    "- Prix et disponibilite geres par le Super Admin"
)
for ($i=0; $i -lt $pl.Count; $i++) { Txt $s13 $pl[$i] 510 (168+$i*24) 380 22 13 $cNoir $false 1 }

Rect $s13 $cBlanc 50 290 420 150
Accent $s13 50 290 420 $cBleuM
Txt $s13 "Codes d'Activation" 70 300 380 30 18 $cBleuM $true 1
$cd = @(
    "- Chiffres en AES-256 dans la base de donnees",
    "- Generes par le Super Admin (duree personnalisable)",
    "- Durees : 30j, 1 an, 2 ans, 3 ans, 4 ans, 5 ans, ou duree libre",
    "- Historique complet d'utilisation consultable"
)
for ($i=0; $i -lt $cd.Count; $i++) { Txt $s13 $cd[$i] 70 (338+$i*24) 380 22 13 $cNoir $false 1 }

Rect $s13 $cBlanc 490 290 420 150
Accent $s13 490 290 420 $cViolet
Txt $s13 "Paiement Mobile" 510 300 380 30 18 $cViolet $true 1
$pm = @(
    "- Wave et Orange Money (Cote d'Ivoire)",
    "- Instructions de paiement configurables dans .env",
    "- L'admin initie puis saisit les infos de paiement",
    "- Le Super Admin verifie et confirme ou rejette",
    "- Confirmation --> abonnement prolonge automatiquement"
)
for ($i=0; $i -lt $pm.Count; $i++) { Txt $s13 $pm[$i] 510 (338+$i*24) 380 22 13 $cNoir $false 1 }

Txt $s13 "Notifications auto : > 50% restant = toutes les 24h  |  <= 50% restant = toutes les 3h  |  Tous les utilisateurs notifies" 50 460 860 25 12 $cRouge $false 1

# ==================== SLIDE 14 - ARCHITECTURE ====================
$s14 = $presentation.Slides.Add(1, 1)
Rect $s14 $cGrisC 0 0 $sw $sh
Header $s14 "Architecture Globale"

# API box
$apiB = Rect $s14 $cBleuM 330 170 300 100
Txt $s14 "API NestJS`rPort 3000" 340 185 280 70 18 $cBlanc $true 2

# DB box
$dbB = Rect $s14 $cGrisL 330 310 300 50
$dbB.Line.ForeColor.RGB = rgb $cBleu
Txt $s14 "MySQL 8 + Prisma ORM" 340 320 280 30 14 $cBleu $true 2

Txt $s14 "^ v" 470 280 30 30 18 $cBleu $true 2

# Mobile box
Rect $s14 $cViolet 50 170 220 100
Txt $s14 "React Native`rExpo" 60 185 200 70 16 $cBlanc $true 2

# Web box
Rect $s14 $cOrange 640 170 220 100
Txt $s14 "React + Vite`rDashboard Web" 650 185 200 70 16 $cBlanc $true 2

# Client QR
Rect $s14 $cVert 50 320 220 50
Txt $s14 "Client QR Code`rHTML5 + JS" 60 328 200 35 13 $cBlanc $true 2

# Printer
Rect $s14 $cGris 640 320 220 50
Txt $s14 "Imprimante Thermique`rESC/POS" 650 328 200 35 13 $cBlanc $true 2

# Arrows
Txt $s14 "-->  <--" 280 200 60 40 20 $cGris $true 2
Txt $s14 "-->  <--" 630 200 60 40 20 $cGris $true 2

Txt $s14 "Socket.IO (WebSocket) - Temps Reel" 50 400 860 25 14 $cOrange $true 2
Txt $s14 "JWT 12h + Bcrypt  |  Guards par role  |  AES-256 (codes)  |  CORS configurable  |  Uploads/  |  QR dynamiques" 50 440 860 25 12 $cGris $false 2
Txt $s14 "Modules NestJS : auth . users . restaurant . tables . zones . menu . commandes . paiement . planning . serveur-table . notifications . statistiques . reservations . evaluations . printer . activation . ai . socket" 50 475 860 30 11 $cGris $false 1

# ==================== SLIDE 15 - STATISTIQUES ====================
$s15 = $presentation.Slides.Add(1, 1)
Rect $s15 $cGrisC 0 0 $sw $sh
Header $s15 "Statistiques et Analytics"

Txt $s15 "Dashboard statistiques complet avec filtre par intervalle de date. Toutes les sections sont filtrees par la periode selectionnee (defaut : aujourd'hui)." 50 130 860 40 14 $cNoir $false 1

$sts = @(
    @("Commandes", "Total, Chiffre d'affaires,`rPanier moyen (cliquable)"),
    @("Tables", "Total, Occupation, CA moyen`rpar table (cliquable)"),
    @("Serveurs", "Performance avec barres,`rfiltr par planning du jour"),
    @("Caissiers", "Performance avec barres,`rCA par mode de paiement"),
    @("Top Plats", "Classement par quantite`rvendue sur la periode"),
    @("Plats Peu Vendus", "Identification des plats`ra ameliorer ou supprimer"),
    @("Affluence", "Graphique par heure`rd'affluence du restaurant"),
    @("Ventes/Jour", "Evolution quotidienne`rdu chiffre d'affaires"),
    @("Ventes/Mois", "Evolution mensuelle`rdu chiffre d'affaires"),
    @("Marge Brute", "CA - Cout matieres premieres`rRentabilite par plat")
)

for ($i=0; $i -lt $sts.Count; $i++) {
    $col = $i % 5
    $row = [Math]::Floor($i / 5)
    $x = 50 + $col * 180
    $y = 180 + $row * 145

    $card = Rect $s15 $cBlanc $x $y 170 130
    $card.Shadow.Type = 1
    $card.Shadow.OffsetX = 1
    $card.Shadow.OffsetY = 1
    $card.Shadow.Transparency = 0.8
    Accent $s15 $x $y 170 $cOrange
    Txt $s15 $sts[$i][0] ($x+8) ($y+10) 154 25 13 $cBleu $true 1
    Txt $s15 $sts[$i][1] ($x+8) ($y+40) 154 80 10 $cNoir $false 1
}

# ==================== SLIDE 16 - ECOSYSTEME ====================
$s16 = $presentation.Slides.Add(1, 1)
Rect $s16 $cGrisC 0 0 $sw $sh
Header $s16 "Ecosysteme RestoPro"

# API
Rect $s16 $cBlanc 50 130 270 280
Accent $s16 50 130 270 $cBleuM
Txt $s16 "RestoPro API" 50 140 270 50 36 $cBleuM $false 2
Txt $s16 "RestoPro API" 50 180 270 35 22 $cBleu $true 2
Txt $s16 "gestion-restaurant-api" 50 215 270 25 12 $cGris $false 2
$aF = @("NestJS 10 + TypeScript","MySQL + Prisma ORM","18 modules fonctionnels","Socket.IO (temps reel)","JWT + Bcrypt + AES-256","Claude AI (Anthropic SDK)","ESC/POS (impression)","QR codes dynamiques","Upload d'images","Seeding de demo")
for ($i=0; $i -lt $aF.Count; $i++) { Txt $s16 ("- " + $aF[$i]) 60 (250+$i*20) 250 20 11 $cNoir $false 1 }

# Web
Rect $s16 $cBlanc 345 130 270 280
Accent $s16 345 130 270 $cOrange
Txt $s16 "RestoPro Web" 345 140 270 50 36 $cOrange $false 2
Txt $s16 "RestoPro Web" 345 180 270 35 22 $cBleu $true 2
Txt $s16 "gestion-restaurant-web" 345 215 270 25 12 $cGris $false 2
$wF = @("React + Vite + TypeScript","Dashboard par role","Grille de tables interactive","CRUD menu avec variantes","Caisse et factures","Planning et reservations","Statistiques et graphiques","Socket.IO + badge","Mode hors-ligne","Interface responsive")
for ($i=0; $i -lt $wF.Count; $i++) { Txt $s16 ("- " + $wF[$i]) 355 (250+$i*20) 250 20 11 $cNoir $false 1 }

# Mobile
Rect $s16 $cBlanc 640 130 270 280
Accent $s16 640 130 270 $cViolet
Txt $s16 "RestoPro Mobile" 640 140 270 50 36 $cViolet $false 2
Txt $s16 "RestoPro Mobile" 640 180 270 35 22 $cBleu $true 2
Txt $s16 "gestion-resto-mobile" 640 215 270 25 12 $cGris $false 2
$mF = @("React Native + Expo","Memes fonctionnalites que Web","Notifications push natives","Vibration (retour haptique)","Appareil photo integre","Interface tactile optimisee","Son de notification (WAV)","Mode hors-ligne","Toasts animes","iOS + Android")
for ($i=0; $i -lt $mF.Count; $i++) { Txt $s16 ("- " + $mF[$i]) 650 (250+$i*20) 250 20 11 $cNoir $false 1 }

# ==================== SLIDE 17 - CONCLUSION ====================
$s17 = $presentation.Slides.Add(1, 1)
Rect $s17 $cBleu 0 0 $sw $sh
Rect $s17 $cOrange 50 200 500 6
Txt $s17 "RestoPro" 50 50 800 100 56 $cBlanc $true 1
Txt $s17 "Solution Complete de Gestion de Restaurant" 50 220 800 50 28 $cBlanc $false 1

$cn = @(
    "[x] Digitalisation complete du parcours client -- du scan QR au paiement",
    "[x] Intelligence artificielle pour simplifier la commande",
    "[x] Temps reel pour une coordination parfaite entre les equipes",
    "[x] 9 roles avec permissions granulaires et modules dynamiques",
    "[x] Multi-plateforme : API, Web, Mobile -- une experience unifiee",
    "[x] Monetisation integree : abonnements, codes, paiements mobiles",
    "[x] Pret pour le deploiement en production"
)
for ($i=0; $i -lt $cn.Count; $i++) {
    Txt $s17 $cn[$i] 50 (280+$i*35) 860 30 15 $cBlanc $false 1
}

Txt $s17 "_________________" 50 530 200 30 14 $cOrange $false 1
Txt $s17 "Stack : NestJS  |  MySQL  |  Socket.IO  |  Claude AI  |  React  |  React Native  |  Expo" 50 560 860 25 12 $cGris $false 1

# ==================== SAUVEGARDE ====================
$outputPath = "d:\mes projots\gestion-restaurant\gestion-restaurant-api\Presentation_RestoPro.pptx"
$presentation.SaveAs($outputPath)
$presentation.Close()
$ppt.Quit()

[System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()

Write-Host "SUCCESS: $outputPath"