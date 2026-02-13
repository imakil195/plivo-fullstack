const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Try different db paths
const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
const outPath = path.join(__dirname, '..', 'slug_output.txt');

let output = '';

try {
    output += `DB path: ${dbPath}\n`;
    output += `Exists: ${fs.existsSync(dbPath)}\n`;

    const db = new Database(dbPath);
    const orgs = db.prepare('SELECT id, name, slug FROM Organization').all();
    output += `Found ${orgs.length} organizations:\n`;

    for (const org of orgs) {
        const cleanSlug = org.name
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 50);

        output += `  "${org.name}": current="${org.slug}", clean="${cleanSlug}"\n`;

        if (org.slug !== cleanSlug) {
            db.prepare('UPDATE Organization SET slug = ? WHERE id = ?').run(cleanSlug, org.id);
            output += `    FIXED: "${org.slug}" -> "${cleanSlug}"\n`;
        } else {
            output += `    OK\n`;
        }
    }

    db.close();
    output += '\nDone!';
} catch (e) {
    output += `Error: ${e.message}\n${e.stack}`;
}

fs.writeFileSync(outPath, output);
