// @ts-check

// @ts-ignore
let {Source, Error} = require("./source")

/**
 * @typedef {{$pos:Number, $type:String, $value:*}} ASTNode
 */

class Function {
  constructor(pos, name, ret) {
    this.pos = pos
    this.name = name
    this.ret = ret
  }
}
class Variable {
  constructor(pos, name, val) {
    this.pos = pos
    this.name = name
    this.val = val
  }
}

class Scope {
  /**
   * @param {Analyzer} analyzer
   * @param {Scope} parent
   * @param {String} name
   */
  constructor(analyzer, parent, name) {
    this.analyzer = analyzer
    this.parent = parent
    this.name = name

    this.children = []

    this.symbols = {} // Symbols registered in this scope
    this.expected = {}// Symbols required in this scope
  }

  /**
   * @param {String} name 
   */
  createChild(name) {
    let child = new Scope(this.analyzer, this, name)
    this.children.push(child)
    return child
  }

  /**
   * @param {ASTNode} nameNode
   * @param {ASTNode} retNode
   */
  registerFunction(nameNode, retNode) {
    let nameStr = nameNode.$value
    let retStr = ""
    if(retNode != null)
      retStr = retNode.$value

    let sym = this.symbols[nameStr]
    if(sym != null) {
      let link = this.analyzer.srcObj.positionInfo(sym.pos).link
      let msg = `symbol '${nameStr}' already defined here: (${link})`
      throw this.analyzer.error(nameNode, msg)
    }

    this.symbols[nameStr] = new Function(nameNode.$pos, nameStr, retStr)

    console.log("Function registered:", this.symbols[nameStr], this.analyzer.srcObj.positionInfo(nameNode.$pos).link)
  }

  /**
   * @param {ASTNode} nameNode
   */
  expectFunction(nameNode) {
    let nameStr = nameNode.$value

    let sym = this.symbols[nameStr]
    if(sym == null) {
      let msg = `function '${nameStr}' is not defined`
      throw this.analyzer.error(nameNode, msg)
    }
  }

  /**
   * @param {ASTNode} nameNode
   * @param {ASTNode} valueNode
   */
  registerVariable(nameNode, valueNode) {
    let nameStr = nameNode.$value

    let sym = this.symbols[nameStr]
    if(sym != null) {
      let link = this.analyzer.srcObj.positionInfo(sym.pos).link
      let msg = `symbol '${nameStr}' already defined here: (${link})`
      throw this.analyzer.error(nameNode, msg)
    }

    this.symbols[nameStr] = new Variable(nameNode.$pos, nameStr, valueNode)

    console.log("Variable registered:", this.symbols[nameStr], this.analyzer.srcObj.positionInfo(nameNode.$pos).link)
  }
}


class Analyzer {
  /**
   * @param {Source} srcObj 
   */
  constructor(srcObj, ruleMap) {
    this.srcObj = srcObj
    this.ruleMap = ruleMap

    this.globalScope = new Scope(this, null, "global")

    /** @type {Scope} */
    this.currentScope = this.globalScope
  }

  /**
   * @param {ASTNode} node
   * @param {String} msg
   * @returns {Error}
   */
  error(node, msg) {
    return this.srcObj.error(msg, node.$pos)
  }

  /**
   * @param {ASTNode} nameNode
   * @param {ASTNode} retNode
   */
  registerFunction(nameNode, retNode) {
    if(nameNode.$value.$type != "string")
      throw this.error(nameNode, `node must have $type="string"`)

    let retValNode = null
    if(retNode != null) {
      if(retNode.$value.$type != "string")
        throw this.error(retNode, `node must have $type="string"`)
      retValNode = retNode.$value
    }
    this.currentScope.registerFunction(nameNode.$value, retValNode)
  }

  /**
   * @param {ASTNode} nameNode
   */
  expectFunction(nameNode) {
    if(nameNode.$value.$type != "string")
      throw this.error(nameNode, `node must have $type="string"`)

    this.currentScope.expectFunction(nameNode.$value)
  }

  /**
   * @param {ASTNode} nameNode
   * @param {ASTNode} valueNode
   */
  registerVariable(nameNode, valueNode) {
    if(nameNode.$value.$type != "string")
      throw this.error(nameNode, `node must have $type="string"`)

    let valValNode = null
    if(valueNode != null)
        valValNode = valueNode.$value

    this.currentScope.registerVariable(nameNode.$value, valValNode)
  }

  /**
   * @param {String} name 
   */
  pushScope(name) {
    this.currentScope = this.currentScope.createChild(name)
  }
  popScope() {
    this.currentScope = this.currentScope.parent
  }

  /**
   * @param {ASTNode} AST 
   */
  analyze(AST) {
    try {
      this.ruleMap[AST.$type].analyze(this, AST)
    } catch(e) {
      console.log(`analyze failed for '${AST.$type}'`)
      throw e
    }
  }
}

// @ts-ignore
module.exports = {
  Analyzer
}