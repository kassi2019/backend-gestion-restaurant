-- Vider toutes les tables sauf Restaurant, utilisateurs et tables_restaurant
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `categories_menu`;
TRUNCATE TABLE `menus`;
TRUNCATE TABLE `sessions_clients`;
TRUNCATE TABLE `commandes`;
TRUNCATE TABLE `commande_details`;
TRUNCATE TABLE `factures`;
TRUNCATE TABLE `notifications`;
TRUNCATE TABLE `plannings`;
TRUNCATE TABLE `serveur_tables`;

SET FOREIGN_KEY_CHECKS = 1;
