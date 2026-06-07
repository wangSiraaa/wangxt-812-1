const fs = require("fs");
const p = (f) => require("path").join(__dirname, f);
const w = (f, c) => { fs.mkdirSync(require("path").dirname(p(f)), {recursive:true}); fs.writeFileSync(p(f), c); console.log("+ " + f); };
module.exports = { w };
