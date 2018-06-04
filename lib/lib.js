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
    throw parser.error("could not locate module", parser.iter - modName.length - 1)
  }

  g_moduleNames.push(modName)
}

/**
 * @param {String} [workDir]
 */
function run(workDir) {
  g_workDir = workDir || "./"
  let modules = {}
  
  // handle main module
  modules["main"] = handleModule()
  return
  
  // handle other modules
  for(let m = 0; m < g_moduleNames.length; m++) {
    let name = g_moduleNames[m]
    modules[name] = handleModule(name)
  }
}

/**
 * @param {String} [name]
 * @return {{ast:ASTNode, src:Source, ctx:*}}
 */
function handleModule(name) {
  let dir = g_workDir 
  if(name != null)
    dir += "/" + name

  // Get all source files in module dir
  let files = fs.readdirSync(dir).filter(f => f.endsWith(".j")).map(f => dir+"/"+f)
  let source = new Source(...files)
  let parser = new Parser(g_ruleMap, source)
  let analyzer = new Analyzer(g_ruleMap, source)

  let ast = parser.parse()
  analyzer.analyze(ast)

  // console.log(JSON.stringify(analyzer.module, null, 2))
  console.log(JSON.stringify(ast, null, 2))

  return {
    src: source,
    ast: ast,
    ctx: analyzer.module,
  }
}

// @ts-ignore
module.exports = {
  registerRule,
  run,
  loadModule
}