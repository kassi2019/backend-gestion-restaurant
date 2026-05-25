import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);

  // Create restaurant
  const restaurant = await prisma.restaurant.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nom: 'RestoPro Demo',
      adresse: '123 Avenue du Restaurant, Kinshasa',
      telephone: '+243990000000',
    },
  });
  console.log('Restaurant créé:', restaurant.nom);

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

  console.log('\n=== Seed terminé avec succès ! ===');
  console.log('Identifiants de test:');
  console.log('  Admin:    0990000000 / 123456');
  console.log('  Serveur:  0990000001 / 123456');
  console.log('  Cuisine:  0990000002 / 123456');
  console.log('  Bar:      0990000003 / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
