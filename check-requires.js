// For checking file actually!
const fs = require('fs'), path = require('path')

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
    e.name === 'node_modules' || e.name === '.git' ? []
    : e.isDirectory() ? walk(path.join(d, e.name))
    : e.name.endsWith('.js') ? [path.join(d, e.name)] : [])
}

let bad = 0
for (const f of walk('.')) {
  const src = fs.readFileSync(f, 'utf8')
  for (const m of src.matchAll(/require\(\s*['"](\.[^'"]+)['"]\s*\)/g)) {
    const p = path.resolve(path.dirname(f), m[1])
    const file = [p, p + '.js'].find(x => fs.existsSync(x) && fs.statSync(x).isFile())
    if (!file) { console.log('MISSING ', f, '->', m[1]); bad++; continue }
    if (!fs.readdirSync(path.dirname(file)).includes(path.basename(file))) {
      console.log('CASE     ', f, '->', m[1]); bad++
    }
  }
}
console.log(bad ? `${bad} problem(s)` : 'all requires OK')
