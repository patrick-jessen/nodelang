// @ts-check

// @ts-ignore
let fs = require("fs")
// @ts-ignore
let {Source} = require("./source")
// @ts-ignore
let {Parser} = require("./parser")
// @ts-ignore
let {Analyzer} = require("./analyzer")

/**
 * @typedef {{$pos:Number, $type:String, $value:*}} ASTNode
 * @typedef {((p:Parser) => *)} ParseFn
 * @typedef {((a:Analyzer, ast:ASTNode) => *)} AnalyzeFn
 * @typedef {{parse:ParseFn, analyze?:AnalyzeFn, $type?:String}} ParserObj
 */

let g_ruleMap = {}
let g_moduleNames = []
let g_workDir = ""

/**
 * @param {String} name
 * @param {ParserObj} obj
 * @returns {ParserObj}
 */
function registerRule(name, obj) {
  obj.$type = name
  g_ruleMap[name] = obj
  return obj
}

/**
 * @param {Parser} parser
 * @param {String} modName
 */
function loadModule(parser, modName) {
  try {
    if(!fs.statSync(g_workDir + "/" + modName).isDirectory()) 
  throw null
  } catch(e) {
    throw parser.error("could not locate module", parser.iter - modName.length - 3)
  }

  g_moduleNames.push(modName)
}

/**
 * @param {String} [workDir]
 */
function run(workDir) {
  g_workDir = workDir || "./"
  let modules = {}
  
  // PARSE //////////////////////////////
  if(g_ruleMap["root"] == null) 
    throw `no root rule is defined`
  
  // parse main module
  modules["main"] = parseModule("")
  
  for(let m = 0; m < g_moduleNames.length; m++) {
    let name = g_moduleNames[m]
    modules[name] = parseModule(name)
  }

  // ANALYZE ////////////////////////////
  let analyzer = new Analyzer(g_ruleMap)
  let _ = analyzer.analyzeModules(modules)
  console.log(_)

  analyzer.link()
}

/**
 * @param {String} name
 * @return {{AST:ASTNode, src:Source}}
 */
function parseModule(name) {
  let dir = g_workDir + "/" + name
  let files = fs.readdirSync(dir).filter(f => f.endsWith(".j")).map(f => dir+"/"+f)
  let source = new Source(...files)
  let parser = new Parser(source)
  return {
    AST: parser.one(g_ruleMap["root"]),
    src: source,
  }
}

// @ts-ignore
module.exports = {
  registerRule,
  run,
  loadModule
}