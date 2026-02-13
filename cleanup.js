const fs = require('fs');
const path = require('path');

const files = [
    'server/scripts/debug-slugs.ts',
    'server/scripts/fix-all-slugs.js',
    'server/scripts/fix-apple.js',
    'server/scripts/fix-apple.ts',
    'server/scripts/list-orgs.ts',
    'server/scripts/migrate-slugs.ts',
    'verify-url.js'
];

files.forEach(file => {
    try {
        const fullPath = path.join(__dirname, file);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`Deleted: ${file}`);
        } else {
            console.log(`Not found: ${file}`);
        }
    } catch (e) {
        console.error(`Error deleting ${file}: ${e.message}`);
    }
});
