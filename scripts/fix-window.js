var fs = require('fs');
var files = ['terrain.js','settlement.js','tech.js','events.js','civilization.js','world.js'];
files.forEach(function(f) {
  var c = fs.readFileSync('assets/js/engine/' + f, 'utf8');
  c = c.replace(/window\./g, 'globalThis.');
  fs.writeFileSync('assets/js/engine/' + f, c);
  console.log('Fixed: ' + f);
});
