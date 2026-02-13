import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const outPath = path.join(import.meta.dirname || __dirname, '..', 'slug_output.txt');

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
}

async function main() {
    const lines: string[] = [];
    try {
        const orgs = await prisma.organization.findMany();
        lines.push(`Found ${orgs.length} organizations:`);

        for (const org of orgs) {
            const cleanSlug = slugify(org.name);
            lines.push(`  "${org.name}": current="${org.slug}", clean="${cleanSlug}"`);

            if (org.slug !== cleanSlug) {
                // Check for conflicts
                const conflict = await prisma.organization.findFirst({
                    where: { slug: cleanSlug, id: { not: org.id } }
                });

                if (conflict) {
                    lines.push(`    WARNING: "${cleanSlug}" taken by "${conflict.name}"`);
                } else {
                    await prisma.organization.update({
                        where: { id: org.id },
                        data: { slug: cleanSlug }
                    });
                    lines.push(`    FIXED: "${org.slug}" -> "${cleanSlug}"`);
                }
            } else {
                lines.push(`    OK: already clean`);
            }
        }

        lines.push('\nDone!');
    } catch (e: any) {
        lines.push(`Error: ${e.message}\n${e.stack}`);
    } finally {
        await prisma.$disconnect();
    }
    fs.writeFileSync(outPath, lines.join('\n'));
}

main();
