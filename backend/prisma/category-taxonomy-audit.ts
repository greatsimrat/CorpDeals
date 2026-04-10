import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import {
  ROOT_CATEGORY_TAXONOMY,
  SUBCATEGORY_TAXONOMY,
  upsertCategoryTaxonomy,
} from './category-taxonomy';

dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

async function getSnapshot() {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
    },
    orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
  });

  const byId = new Map(categories.map((category) => [category.id, category]));
  const roots = categories.filter((category) => !category.parentId);
  const subcategories = categories.filter((category) => Boolean(category.parentId));

  const grouped = roots
    .map((root) => ({
      root,
      subcategories: subcategories.filter((subcategory) => subcategory.parentId === root.id),
    }))
    .sort((a, b) => a.root.name.localeCompare(b.root.name));

  const orphans = subcategories.filter((subcategory) => !byId.has(String(subcategory.parentId)));

  const duplicateNames = new Map<string, typeof categories>();
  for (const category of categories) {
    const key = normalize(category.name);
    const rows = duplicateNames.get(key) || [];
    rows.push(category);
    duplicateNames.set(key, rows);
  }

  return {
    categories,
    roots,
    subcategories,
    grouped,
    orphans,
    duplicateNames: [...duplicateNames.entries()]
      .filter(([, rows]) => rows.length > 1)
      .map(([key, rows]) => ({ key, rows })),
  };
}

async function main() {
  const apply = process.argv.includes('--apply');

  if (apply) {
    const result = await upsertCategoryTaxonomy(prisma);
    console.log(
      `Applied category normalization (${result.rootsUpserted} roots, ${result.subcategoriesUpserted} subcategories).`
    );
  }

  const snapshot = await getSnapshot();

  const existingRootBySlug = new Map(snapshot.roots.map((category) => [category.slug, category]));
  const existingSubBySlug = new Map(
    snapshot.subcategories.map((subcategory) => [subcategory.slug, subcategory])
  );

  const missingRoots = ROOT_CATEGORY_TAXONOMY.filter(
    (category) => !existingRootBySlug.has(category.slug)
  );
  const missingSubcategories = SUBCATEGORY_TAXONOMY.filter(
    (subcategory) => !existingSubBySlug.has(subcategory.slug)
  );

  const mismatchedNames = [
    ...ROOT_CATEGORY_TAXONOMY.map((category) => ({
      slug: category.slug,
      expectedName: category.name,
      actualName: existingRootBySlug.get(category.slug)?.name || null,
    })),
    ...SUBCATEGORY_TAXONOMY.map((subcategory) => ({
      slug: subcategory.slug,
      expectedName: subcategory.name,
      actualName: existingSubBySlug.get(subcategory.slug)?.name || null,
    })),
  ].filter(
    (row) => row.actualName && normalize(String(row.actualName)) !== normalize(row.expectedName)
  );

  console.log('\nA) Current category list');
  for (const root of snapshot.roots.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`- ${root.name} (${root.slug})`);
  }

  console.log('\nB) Current subcategory list grouped by category');
  for (const group of snapshot.grouped) {
    console.log(`- ${group.root.name}`);
    if (!group.subcategories.length) {
      console.log('  - (none)');
      continue;
    }
    for (const subcategory of group.subcategories.sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`  - ${subcategory.name} (${subcategory.slug})`);
    }
  }

  console.log('\nC) Missing categories/subcategories');
  console.log(`- Missing root categories: ${missingRoots.length}`);
  for (const category of missingRoots) {
    console.log(`  - ${category.name} (${category.slug})`);
  }
  console.log(`- Missing subcategories: ${missingSubcategories.length}`);
  for (const subcategory of missingSubcategories) {
    console.log(`  - ${subcategory.name} (${subcategory.slug}) -> ${subcategory.parentSlug}`);
  }
  console.log(`- Orphaned subcategories: ${snapshot.orphans.length}`);
  for (const orphan of snapshot.orphans) {
    console.log(`  - ${orphan.name} (${orphan.slug})`);
  }
  console.log(`- Duplicate/near-duplicate names: ${snapshot.duplicateNames.length}`);
  for (const duplicate of snapshot.duplicateNames) {
    console.log(`  - ${duplicate.key}: ${duplicate.rows.map((row) => row.name).join(', ')}`);
  }
  console.log(`- Inconsistent canonical names: ${mismatchedNames.length}`);
  for (const mismatch of mismatchedNames) {
    console.log(`  - ${mismatch.slug}: expected "${mismatch.expectedName}", found "${mismatch.actualName}"`);
  }

  console.log('\nD) Recommended normalization plan');
  console.log('- Reuse canonical slugs from category-taxonomy.ts for all pricing references.');
  console.log('- Run `npm run db:categories:audit -- --apply` before pricing seed inserts.');
  console.log('- Keep General as fallback only; exclude it from pricing matrices.');
  console.log('- Use only canonical slugs in offer and pricing configs to avoid drift.');
}

main()
  .catch((error) => {
    console.error('Category taxonomy audit failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
