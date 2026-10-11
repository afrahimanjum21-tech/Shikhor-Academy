/**
 * 005-success-stories
 *
 * Adds the SuccessStories table (student success stories shown on the public
 * home page and managed from the admin panel).
 *
 * Safety properties (same as 001/002/003/004):
 *  - Additive-only; never drops tables, columns, or data.
 *  - Guarded against the table already existing.
 */

import SuccessStory from '../models/SuccessStory.js';

export async function up(queryInterface, Sequelize) {
  const tables = await queryInterface.showAllTables();
  const table = String(SuccessStory.getTableName()).toLowerCase();
  if (tables.some((t) => String(t).toLowerCase() === table)) {
    console.log(`  = ${SuccessStory.getTableName()} already exists, skipping`);
    return;
  }

  await queryInterface.createTable(SuccessStory.getTableName(), SuccessStory.rawAttributes);
  console.log(`  + ${SuccessStory.getTableName()}`);
}

export async function down(queryInterface) {
  const tables = await queryInterface.showAllTables();
  const table = String(SuccessStory.getTableName()).toLowerCase();
  if (tables.some((t) => String(t).toLowerCase() === table)) {
    await queryInterface.dropTable(SuccessStory.getTableName());
  }
}