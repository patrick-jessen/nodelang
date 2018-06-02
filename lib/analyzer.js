// @ts-check

/**
 * @typedef {{$pos:Number, $type:String, $value:*}} ASTNode
 */

class TypeResolver {
  constructor() {

  }
}

class Module {
  constructor(analyzer) {
    this.analyzer = analyzer
    this.parent = null

    this.symbols = {}
    this.expect = {}
  }

  linkLocal() {

  }

  error(msg, pos) {
    return this.analyzer.srcObj.error(msg, pos)
  }
  positionInfo(pos) {
    return this.analyzer.srcObj.positionInfo(pos)
  }

  toJSON() {
    return this.symbols
  }
}
class Function {
  constructor(analyzer, parent, nameNode, argsNode, retNode) {
    this.analyzer = analyzer
    this.parent = parent
    this.nameNode = nameNode
    this.argsNode = argsNode
    this.retNode = retNode

    
    this.stackSize = 0
    this.symbols = {}
    this.statements = []
  }

  /**
   * @param {ASTNode} nameNode 
   */
  declareVariable(nameNode, typeNode) {
    let sym = this.symbols[nameNode.$value]
    if(sym != null) {
      let pi = this.analyzer.srcObj.positionInfo(sym.pos)
      throw this.analyzer.srcObj.error(`symbol '${nameNode.$value}' already defined here: (${pi.link})`, nameNode.$pos)
    }

    let type
    if(typeNode != null)
      type = typeNode.$value

    this.symbols[nameNode.$value] = new Variable(this.stackSize, type)
    this.stackSize++
  }

  /**
   * @param {ASTNode} nameNode
   * @param {ASTNode} valueNode
   */
  assignVariable(nameNode, valueNode) {
    let sym = this.symbols[nameNode.$value]
    if(sym == null)
      throw this.analyzer.srcObj.error(`variable ${nameNode.$value} not previously defined`, nameNode.$pos)
    if(!(sym instanceof Variable))
      throw this.analyzer.srcObj.error(`${nameNode.$value} is not a variable`, nameNode.$pos)

    let rhsType
    switch(valueNode.$type) {
      case "integerLiteral":
        rhsType = "int"
        break
      case "floatLiteral":
        rhsType = "float"
        break
      case "stringLiteral":
        rhsType = "string"
      case "identifier":
        rhsType = this.symbols[valueNode.$value.$value].type
    }

    if(sym.type == null) {
      sym.type = rhsType
    }
    else if(sym.type != rhsType) {
      throw this.analyzer.srcObj.error(`type mismatch. Expected ${sym.type} but got ${rhsType}`, valueNode.$pos)
    }
    
    this.statements.push({
      type: "variableAssign",
      dst: sym.id,
      value: {}
    })
  }

  error(msg, pos) {
    return this.analyzer.srcObj.error(msg, pos)
  }
  positionInfo(pos) {
    return this.analyzer.srcObj.positionInfo(pos)
  }

  toJSON() {
    return {
      stackSize: this.stackSize,
      symbols: this.symbols,
      statements: this.statements
    }
  }
}


class Variable {
    constructor(id, type) {
      this.id = id
      this.type = type
    }
}


class Scope {

}

class Analyzer {
  constructor(ruleMap, srcObj) {
    this.ruleMap = ruleMap
    this.srcObj = srcObj

    this.module = new Module(this)
    this.curScope = this.module
  }

  analyze(ast) {
    try {
      this.ruleMap[ast.$type].analyze(this, ast)
    } catch(e) {
      console.log(`analyze2 failed for '${ast.$type}'`)
      throw e
    }
  }

  linkLocal() {
    this.module.linkLocal()
  }

  pushFunction(nameNode, argsNode, retNode) {
    let fn = new Function(this, this.curScope, nameNode, argsNode, retNode)
    this.registerSymbol(nameNode, fn)
    this.curScope = fn
  }

  pop() {
    this.curScope = this.curScope.parent
  }

  declareVariable(nameNode, typeNode) {
    this.curScope.declareVariable(nameNode, typeNode)
  }
  assignVariable(nameNode, valueNode) {
    this.curScope.assignVariable(nameNode, valueNode)
  }

  registerSymbol(nameNode, obj) {
    let sym = this.curScope.symbols[nameNode.$value]
    if(sym != null) {
      let pi = this.srcObj.positionInfo(sym.pos)
      throw this.srcObj.error(`symbol '${nameNode.$value}' already defined here: (${pi.link})`, nameNode.$pos)
    }

    this.curScope.symbols[nameNode.$value] = obj
  }

  expectVariable(nameNode) {
    let scope = this.curScope
    while(scope.symbols[nameNode.$value] == null) {
      scope = scope.parent
      if(scope == null)
        throw this.srcObj.error(`undeclared variable ${nameNode.$value}`, nameNode.$pos)
    }
  }

}

// @ts-ignore
module.exports = {
  Analyzer
}