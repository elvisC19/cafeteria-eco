const fs = require('fs');
const path = require('path');

const directory = 'c:\\Users\\Usuario\\Desktop\\6to SEMESTRE\\economica\\cafeteria\\.next';

function listFiles(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(listFiles(fullPath));
      } else {
        results.push(fullPath);
      }
    });
  } catch (err) {
    // Ignore
  }
  return results;
}

const files = listFiles(directory);
console.log('Total files in .next:', files.length);
console.log('Sample files:', files.slice(0, 50));
