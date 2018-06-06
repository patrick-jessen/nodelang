// @ts-check

/**
 * @typedef {{$pos:Number, $type:String, $value:*}} ASTNode
 */

class Type {
  constructor() {
    
  }
}

let typesMap = {
  "int": new Type(),
  "float": new Type(),
  "string": new Type(),
}


class Function {
  constructor(analyzer, parent, nameNode, type) {
    this.analyzer = analyzer
    this.parent = parent
    this.nameNode = nameNode
    this.type = type

    if(nameNode != null)
      this.name = nameNode.$value

    
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
    if(typeNode != null) {
      type = typeNode.$value
      if(typesMap[type] == null)
        throw this.analyzer.srcObj.error(`unknown type '${type}'`, typeNode.$pos)
    }

    this.symbols[nameNode.$value] = new Variable(this, this.stackSize, type)
    this.stackSize++
  }

  /**
   * @param {ASTNode} nameNode
   * @param {ASTNode} valueNode
   */
  assignVariable(nameNode, valueNode) {
    let sym = this.getSymbol(nameNode)
    if(!(sym instanceof Variable))
      throw this.analyzer.srcObj.error(`${nameNode.$value} is not a variable`, nameNode.$pos)

    let rhsType = this.analyzer.inferType(valueNode)

    if(sym.type == null)
      sym.type = rhsType
    else if(sym.type != rhsType)
      throw this.analyzer.srcObj.error(`type mismatch. Expected ${sym.type} but got ${rhsType}`, valueNode.$pos)
    
    this.statements.push({
      type: "variableAssign",
      dst: sym,
      value: valueNode
    })
  }

  getSymbol(nameNode) {
    let scope = this
    let sym = null

    while(sym == null) {
      if(scope == null)
        throw this.analyzer.srcObj.error(`variable ${nameNode.$value} not previously defined`, nameNode.$pos)

      sym = scope.symbols[nameNode.$value]
      scope = scope.parent
    }

    return sym
  }

  /**
   * @param {ASTNode} nameNode 
   */
  declareFunction(nameNode, retTypeNode) {
    let sym = this.symbols[nameNode.$value]
    if(sym != null) {
      let pi = this.analyzer.srcObj.positionInfo(sym.pos)
      throw this.analyzer.srcObj.error(`symbol '${nameNode.$value}' already defined here: (${pi.link})`, nameNode.$pos)
    }

    let retType = ""
    if(retTypeNode != null) {
      retType = retTypeNode.$value
    }

    let type = `() -> ${retType}`

    let fn = new Function(this.analyzer, this, nameNode, type)
    this.symbols[nameNode.$value] = fn
    return fn
  }

  error(msg, pos) {
    return this.analyzer.srcObj.error(msg, pos)
  }
  positionInfo(pos) {
    return this.analyzer.srcObj.positionInfo(pos)
  }

  toJSON() {
    return {
      type: this.type,
      stackSize: this.stackSize,
      symbols: this.symbols,
      statements: this.statements
    }
  }
}


class Variable {
    constructor(scope, id, type) {
      this.scope = scope
      this.id = id
      this.type = type
    }

    toJSON() {
      return {
        scope: this.scope.name,
        id: this.id,
        type: this.type
      }
    }
}

class Analyzer {
  constructor(ruleMap, srcObj) {
    this.ruleMap = ruleMap
    this.srcObj = srcObj

    this.module = new Function(this, null, null, "module")
    this.curScope = this.module
  }

  analyze(ast) {
    try {
      this.ruleMap[ast.$type].analyze(this, ast)
    } catch(e) {
      console.log(`analyze() failed for '${ast.$type}'`)
      throw e
    }
  }

  /**
   * @param {ASTNode} ast
   * @returns {String} 
   */
  inferType(ast) {
    try {
      return this.ruleMap[ast.$type].inferType(this, ast)
    } catch(e) {
      console.log(`inferType() failed for '${ast.$type}'`)
      throw e
    }
  }

  pushFunction(nameNode, retNode) {
    this.curScope = this.curScope.declareFunction(nameNode, retNode)
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

  getVariable(name) {
    let scope = this.curScope
    while(scope.symbols[name] == null) {
      scope = scope.parent
      if(scope == null)
        return null
    }
    return scope.symbols[name]
  }

}

// @ts-ignore
module.exports = {
  Analyzer
}