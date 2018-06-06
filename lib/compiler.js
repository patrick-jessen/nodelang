// @ts-check

// @ts-ignore
let {Module} = require("./module")

let workDir = "./"
let importNames = []

/**
 * @param {String} name 
 */
function importModule(name) {
  importNames.push(name)
}

/**
 * @param {String} [dir]
 */
function start(dir) {
  if(dir != null)
    workDir = dir

  let mainMod = new Module(workDir, importModule)
  mainMod.process()

  for(let i = 0; i < importNames.length; i++) {
    let mod = new Module(`${workDir}/${importNames[i]}`, importModule)
    mod.process()
  }
}

// @ts-ignore
module.exports = {
  importModule,
  start
}