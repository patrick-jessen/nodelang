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
   * @param {Source} srcObj
   * @param {Scope} parent
   * @param {String} name
   */
  constructor(srcObj, parent, name) {
    this.srcObj = srcObj
    this.parent = parent
    this.name = name

    this.children = []

    this.symbols = {} // Symbols registered in this scope
    this.expected = {}// Symbols required in this scope
  }

  error(node, msg) {
    return this.srcObj.error(msg, node.$pos)
  }

  /**
   * @param {String} name 
   * @param {Source} srcObj
   */
  createChild(name, srcObj) {
    if(srcObj == null)
      srcObj = this.srcObj

    let child = new Scope(srcObj, this, name)
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
      let link = this.srcObj.positionInfo(sym.pos).link
      let msg = `symbol '${nameStr}' already defined here: (${link})`
      throw this.error(nameNode, msg)
    }

    this.symbols[nameStr] = new Function(nameNode.$pos, nameStr, retStr)

    console.log("Function registered:", this.symbols[nameStr], this.srcObj.positionInfo(nameNode.$pos).link)
  }

  /**
   * @param {ASTNode} nameNode
   */
  expectFunction(nameNode) {
    let nameStr = nameNode.$value
    if(this.expected[nameStr] != null) return

    this.expected[nameStr] = nameNode.$pos
  }

  /**
   * @param {ASTNode} nameNode
   * @param {ASTNode} valueNode
   */
  registerVariable(nameNode, valueNode) {
    let nameStr = nameNode.$value

    let sym = this.symbols[nameStr]
    if(sym != null) {
      let link = this.srcObj.positionInfo(sym.pos).link
      let msg = `symbol '${nameStr}' already defined here: (${link})`
      throw this.error(nameNode, msg)
    }

    this.symbols[nameStr] = new Variable(nameNode.$pos, nameStr, valueNode)

    console.log("Variable registered:", this.symbols[nameStr], this.srcObj.positionInfo(nameNode.$pos).link)
  }

  link() {
    for(let k in this.expected) {
      
      /** @type {Scope} */
      let scope = this

      while(scope.symbols[k] == null) {
        scope = scope.parent
        if(scope == null)
          throw this.srcObj.error("unresolved symbol", this.expected[k])
      }
    }

    for(let c of this.children) {
      c.link()
    }
  }
}


class Analyzer {
  /**
   * @param {*} ruleMap
   */
  constructor(ruleMap) {
    this.ruleMap = ruleMap
    this.currentSrcObj = null

    this.globalScope = new Scope(null, null, "global")

    /** @type {Scope} */
    this.currentScope = this.globalScope

  }

  link() {
    this.globalScope.link()
  }

  /**
   * @param {ASTNode} node
   * @param {String} msg
   * @returns {Error}
   */
  error(node, msg) {
    return this.currentSrcObj.error(msg, node.$pos)
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
   * @param {Source} [srcObj]
   */
  pushScope(name, srcObj) {
    this.currentScope = this.currentScope.createChild(name, srcObj)
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

  /**
   * @param {{[x:string]:{AST:ASTNode, src:Source}}} modules 
   */
  analyzeModules(modules) {
    for(let k in modules) {
      this.pushScope(`module_${k}`, modules[k].src)
      this.currentSrcObj = modules[k].src
      this.analyze(modules[k].AST)
      this.popScope()
    }
  }
}

// @ts-ignore
module.exports = {
  Analyzer
}