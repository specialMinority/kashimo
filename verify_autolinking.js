const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, 'android', 'settings.gradle');
try {
    const content = fs.readFileSync(settingsPath, 'utf8');
    console.log('--- Content Start ---');
    console.log(content);
    console.log('--- Content End ---');

    const regex = /expoAutolinking\.useExpoModules\(\)/;
    const match = content.match(regex);

    if (match) {
        console.log('SUCCESS: Found useExpoModules()');
    } else {
        console.log('FAILURE: Did NOT find useExpoModules()');
    }
} catch (error) {
    console.error('Error reading file:', error);
}
