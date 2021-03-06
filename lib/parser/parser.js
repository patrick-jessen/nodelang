// @ts-check

/**
 * @typedef {{name:String, [x:string]:*}} TokenRule
 * @typedef {{name:String, func:(p:Parser) => AstNode}} Rule
 */

// @ts-ignore
let rulesMap = require("./rules")
// @ts-ignore
let {Token} = require("../lexer/lexer")

class AstNode {

}

class Parser {
  /**
   * @param {Token[]} tokens 
   * @param {(msg:String,pos:Number)=>*} errHandler 
   * @param {(dir:String)=>void} importHandler 
   */
  constructor(tokens, errHandler, importHandler) {
    this.tokens = tokens
    this.errHandler = errHandler
    this.importHandler = importHandler
    this.iter = 0
    this.err = null
    this.allErrs = []
  }

  /**
   * @param {(Rule|TokenRule)[]} alts 
   * @returns {AstNode}
   */
  one(...alts) {
    let oldIter = this.iter

    for(let i = 0; i < alts.length; i++) {
      let alt = alts[i]

      try {
        if(typeof alt == "function") {
          // @ts-ignore
          return alt(this)
        }

        // @ts-ignore
        if(alt.func != null) {
          // @ts-ignore
          return alt.func(this)
        }
        
        // @ts-ignore
        return this.handleToken(alt)
      }
      catch(e) {
        this.allErrs.push(e)
        if(this.err == null || e.pos > this.err.pos) {
          this.err = e
        }

        this.iter = oldIter
      }
    }

    // console.log(this.allErrs.map(e => e.toString()).join("\n\n"))
    throw this.err
  }


  opt(...alts) {
    try {
      return this.one(...alts)
    }
    catch(e) {
      return null
    }
  }

  any(...alts) {
    let ret = []

    while(true) {
      try {
        let r = this.one(...alts)
        ret.push(r)
      }
      catch(e) {
        return ret
      }
    }
  }

  many(...alts) {
    let ret = []

    while(true) {
      try {
        let r = this.one(...alts)
        ret.push(r)
      }
      catch(e) {
        if(ret.length == 0)
          throw e
        return ret
      }
    }
  }

  /**
   * @param {TokenRule} rule
   */
  handleToken(rule) {
    let token = this.tokens[this.iter]
    if(token.$type != rule.name)
      throw this.errHandler(`expected ${rule.name}, but got ${token.$type}`, token.position)
    this.iter++
    return token
  }

  /**
   * @param {String} dir 
   */
  importModule(dir) {
    this.importHandler(dir)
  }
}

/**
 * @param {Token[]} tokens 
 * @param {(msg:String,pos:Number)=>void} errHandler 
 * @returns {AstNode}
 */
function run(tokens, errHandler, importHandler) {
  if(rulesMap["root"] == null)
    throw `no 'root' parser rule is defined`
  for(let k in rulesMap) {
    rulesMap[k].name = k
  }

  let parser = new Parser(tokens, errHandler, importHandler)
  let ast = parser.one(rulesMap["root"])
  if(parser.iter < tokens.length - 2) { // -2 to ignore NEWLINE and EOS token
    if(parser.err)
      throw parser.err
    else
      throw errHandler(`did not parse further`, tokens[parser.iter].position)
  }
  return ast
}

// @ts-ignore
module.exports = {
  run
}