import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);

  // Create restaurant
  const dateFinTrial = new Date();
  dateFinTrial.setDate(dateFinTrial.getDate() + 14); // Trial 14 jours

  const restaurant = await prisma.restaurant.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nom: 'RestoPro Demo',
      adresse: '123 Avenue du Restaurant, Kinshasa',
      telephone: '+243990000000',
      typeAbonnement: 'TRIAL',
      dateFinAbonnement: dateFinTrial,
    },
  });
  console.log('Restaurant créé:', restaurant.nom, '- Abonnement TRIAL jusqu\'au', dateFinTrial.toLocaleDateString('fr-FR'));

  // Create SUPER_ADMIN (fournisseur du logiciel)
  const superAdmin = await prisma.utilisateur.upsert({
    where: { telephone: '0999999999' },
    update: {},
    create: {
      nom: 'Super Admin',
      telephone: '0999999999',
      mot_de_passe: hashedPassword,
      role: 'SUPER_ADMIN',
      statut: 'ACTIF',
      restaurantId: restaurant.id,
    },
  });
  console.log('Super Admin créé:', superAdmin.nom, '- Tél: 0999999999 / Mot de passe: 123456');

  // Create admin user
  const admin = await prisma.utilisateur.upsert({
    where: { telephone: '0990000000' },
    update: {},
    create: {
      nom: 'Admin Principal',
      telephone: '0990000000',
      mot_de_passe: hashedPassword,
      role: 'ADMIN',
      statut: 'ACTIF',
      restaurantId: restaurant.id,
    },
  });
  console.log('Admin créé:', admin.nom, '- Tél: 0990000000 / Mot de passe: 123456');

  // Create serveur
  const serveur = await prisma.utilisateur.upsert({
    where: { telephone: '0990000001' },
    update: {},
    create: {
      nom: 'Jean Serveur',
      telephone: '0990000001',
      mot_de_passe: hashedPassword,
      role: 'SERVEUR',
      statut: 'ACTIF',
      restaurantId: restaurant.id,
    },
  });
  console.log('Serveur créé:', serveur.nom, '- Tél: 0990000001 / Mot de passe: 123456');

  // Create cuisine
  const cuisine = await prisma.utilisateur.upsert({
    where: { telephone: '0990000002' },
    update: {},
    create: {
      nom: 'Marie Cuisine',
      telephone: '0990000002',
      mot_de_passe: hashedPassword,
      role: 'CUISINE',
      statut: 'ACTIF',
      restaurantId: restaurant.id,
    },
  });
  console.log('Cuisine créée:', cuisine.nom, '- Tél: 0990000002 / Mot de passe: 123456');

  // Create bar
  const bar = await prisma.utilisateur.upsert({
    where: { telephone: '0990000003' },
    update: {},
    create: {
      nom: 'Pierre Bar',
      telephone: '0990000003',
      mot_de_passe: hashedPassword,
      role: 'BAR',
      statut: 'ACTIF',
      restaurantId: restaurant.id,
    },
  });
  console.log('Bar créé:', bar.nom, '- Tél: 0990000003 / Mot de passe: 123456');

  // Create categories
  const categoriesData = [
    { nom: 'Boissons', ordreService: 1, destination: 'BAR' as const },
    { nom: 'Entrées', ordreService: 2, destination: 'CUISINE' as const },
    { nom: 'Plats Principaux', ordreService: 3, destination: 'CUISINE' as const },
    { nom: 'Desserts', ordreService: 4, destination: 'DESSERT' as const },
  ];

  const categories = [];
  for (const cat of categoriesData) {
    const c = await prisma.categorieMenu.upsert({
      where: { id: categoriesData.indexOf(cat) + 1 },
      update: {},
      create: { ...cat, restaurantId: restaurant.id },
    });
    categories.push(c);
  }
  console.log('Catégories créées:', categories.length);

  // Create menus
  const menusData = [
    { nom: 'Coca-Cola 33cl', prix: 3.50, categorieId: categories[0].id, restaurantId: restaurant.id },
    { nom: 'Jus d\'Orange Pressé', prix: 4.00, categorieId: categories[0].id, restaurantId: restaurant.id },
    { nom: 'Salade César', prix: 8.00, categorieId: categories[1].id, restaurantId: restaurant.id },
    { nom: 'Soupe du Jour', prix: 6.00, categorieId: categories[1].id, restaurantId: restaurant.id },
    { nom: 'Poulet DG', prix: 15.00, categorieId: categories[2].id, restaurantId: restaurant.id, tempsPreparation: 30 },
    { nom: 'Poisson Braisé', prix: 18.00, categorieId: categories[2].id, restaurantId: restaurant.id, tempsPreparation: 35 },
    { nom: 'Mafé Viande', prix: 14.00, categorieId: categories[2].id, restaurantId: restaurant.id, tempsPreparation: 25 },
    { nom: 'Fondue au Chocolat', prix: 9.00, categorieId: categories[3].id, restaurantId: restaurant.id },
    { nom: 'Salade de Fruits', prix: 7.00, categorieId: categories[3].id, restaurantId: restaurant.id },
  ];

  for (const menu of menusData) {
    await prisma.menu.create({ data: menu });
  }
  console.log('Menus créés:', menusData.length);

  // Create tables
  // Table comptoir (T00) — pour les commandes à emporter
  await prisma.tableRestaurant.create({
    data: {
      numero: 'T00',
      zone: 'Comptoir',
      restaurantId: restaurant.id,
      qrCode: `QR-${restaurant.id}-T00-${Date.now()}`,
    },
  });

  const zones = ['Terrasse', 'Intérieur', 'VIP'];
  for (let i = 1; i <= 10; i++) {
    await prisma.tableRestaurant.create({
      data: {
        numero: `T${i.toString().padStart(2, '0')}`,
        zone: zones[i % 3],
        restaurantId: restaurant.id,
        qrCode: `QR-${restaurant.id}-T${i}-${Date.now()}`,
        serveurId: serveur.id,
      },
    });
  }
  console.log('Tables créées: 10');

  // Create planning for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const heureDebut = new Date('1970-01-01T08:00:00');
  const heureFin = new Date('1970-01-01T23:00:00');

  await prisma.planning.create({
    data: {
      utilisateurId: serveur.id,
      jour: today,
      heureDebut,
      heureFin,
      statut: 'ACTIF',
    },
  });
  console.log('Planning créé pour le serveur');

  // Créer un code d'activation de test (chiffré AES)
  const crypto = require('crypto');
  const CODE_SECRET = 'activ-code-secret-key-2024';
  const key = Buffer.from(CODE_SECRET.padEnd(32, '0').slice(0, 32), 'utf-8');

  function encryptCode(plain: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let enc = cipher.update(plain, 'utf-8', 'hex');
    enc += cipher.final('hex');
    return iv.toString('hex') + ':' + enc;
  }

  const codeTestClair = 'RESTO-TEST-CODE';
  const codeTestEncrypted = encryptCode(codeTestClair);
  await prisma.codeActivation.upsert({
    where: { id: 1 },
    update: {},
    create: {
      codeEncrypted: codeTestEncrypted,
      dureeJours: 30,
    },
  });
  console.log('Code test créé:', codeTestClair, '- Durée: 30 jours (chiffré en base)');

  // Créer les modules par défaut
  const defaultModules = [
    { nom: 'Accueil', icon: '🏠', route: '/', ordre: 1 },
    { nom: 'Tables', icon: '🪑', route: '/tables', ordre: 2 },
    { nom: 'Affectation', icon: '🔄', route: '/assign-tables', ordre: 3 },
    { nom: 'Commandes', icon: '📋', route: '/commandes', ordre: 4 },
    { nom: 'Menu', icon: '🍽️', route: '/menu', ordre: 5 },
    { nom: 'Planning', icon: '📅', route: '/planning', ordre: 6 },
    { nom: 'Caisse', icon: '💰', route: '/caisse', ordre: 7 },
    { nom: 'Users', icon: '👥', route: '/users', ordre: 8 },
    { nom: 'Notifications', icon: '🔔', route: '/notifications', ordre: 9 },
    { nom: 'Stats', icon: '📊', route: '/stats', ordre: 10 },
    { nom: 'Paramètres', icon: '⚙️', route: '/parametres', ordre: 11 },
    { nom: 'Abonnement', icon: '⭐', route: '/abonnement', ordre: 12 },
    { nom: 'Générer codes', icon: '🔑', route: '/super/codes', ordre: 13 },
    { nom: 'Stock', icon: '📦', route: '/stock', ordre: 14 },
  ];
  for (const m of defaultModules) {
    await prisma.module.upsert({
      where: { id: defaultModules.indexOf(m) + 1 },
      update: { nom: m.nom, icon: m.icon, route: m.route, ordre: m.ordre },
      create: m,
    });
  }
  console.log('Modules créés:', defaultModules.length);

  // Assigner les modules par défaut aux utilisateurs existants
  const roleModules: Record<string, string[]> = {
    SUPER_ADMIN: ['Accueil', 'Tables', 'Affectation', 'Commandes', 'Menu', 'Planning', 'Caisse', 'Users', 'Notifications', 'Stats', 'Paramètres', 'Abonnement', 'Générer codes', 'Stock'],
    ADMIN: ['Accueil', 'Tables', 'Affectation', 'Commandes', 'Menu', 'Planning', 'Caisse', 'Users', 'Notifications', 'Stats', 'Paramètres', 'Abonnement', 'Stock'],
    MANAGER: ['Accueil', 'Tables', 'Affectation', 'Commandes', 'Menu', 'Planning', 'Caisse', 'Users', 'Notifications', 'Stats'],
    SERVEUR: ['Accueil', 'Tables', 'Commandes', 'Planning', 'Notifications'],
    CUISINE: ['Accueil', 'Commandes', 'Planning', 'Notifications'],
    BAR: ['Accueil', 'Commandes', 'Planning', 'Notifications'],
    CAISSIER: ['Accueil', 'Planning', 'Caisse', 'Notifications'],
  };
  const allUsers = await prisma.utilisateur.findMany({ include: { userModules: true } });
  for (const utilisateur of allUsers) {
    const noms = roleModules[utilisateur.role] || ['Accueil', 'Notifications'];
    const mods = await prisma.module.findMany({ where: { nom: { in: noms } } });
    await prisma.userModule.deleteMany({ where: { utilisateurId: utilisateur.id } });
    for (const m of mods) {
      await prisma.userModule.create({ data: { utilisateurId: utilisateur.id, moduleId: m.id } });
    }
  }
  console.log('Modules assignés aux utilisateurs');

  console.log('\n=== Seed terminé avec succès ! ===');
  console.log('Identifiants de test:');
  console.log('  Super Admin: 0999999999 / 123456');
  console.log('  Admin:       0990000000 / 123456');
  console.log('  Serveur:     0990000001 / 123456');
  console.log('  Cuisine:     0990000002 / 123456');
  console.log('  Bar:         0990000003 / 123456');
  console.log('Code activation test: RESTO-TEST-CODE (30 jours)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
