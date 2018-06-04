// @ts-check

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

  let mainMod = new Module(workDir)
  mainMod.process()
}

module.exports = {
  importModule,
  start
}