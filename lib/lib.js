// @ts-check

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

let ruleMap = {}

/**
 * @param {String} name
 * @param {ParserObj} obj
 * @returns {ParserObj}
 */
function registerRule(name, obj) {
  obj.$type = name
  ruleMap[name] = obj
  return obj
}

/**
 * @param {String} file 
 */
function run(file) {
  let source = new Source(file)
  let parser = new Parser(source)
  let analyzer = new Analyzer(source, ruleMap)
  
  // PARSE //////////////////////////////
  if(ruleMap["root"] == null) 
  throw `no root rule is defined`
  
  let AST = parser.one(ruleMap["root"])
  
  // ANALYZE ////////////////////////////
  let _ = analyzer.analyze(AST)
  console.log(_)

  analyzer.link()
}

// @ts-ignore
module.exports = {
  registerRule,
  run
}