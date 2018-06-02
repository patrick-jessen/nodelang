// @ts-check


class TypeResolver {
  constructor() {

  }
}

class Module {
  constructor(analyzer) {
    this.analyzer = analyzer
    this.parent = null
    this.symbols = {}
  }

  error(msg, pos) {
    return this.analyzer.srcObj.error(msg, pos)
  }
  positionInfo(pos) {
    return this.analyzer.srcObj.positionInfo(pos)
  }

  pushFunction(pos, name, args, ret) {
    let sym = this.symbols[name]
    if(sym != null) {
      let pi = this.positionInfo(sym.pos)
      throw this.error(`symbol '${name}' already defined here: (${pi.link})`, pos)
    }
    
    sym = new Function(this.analyzer, this, pos, name, args, ret)
    this.symbols[name] = sym
    return sym
  }

  registerVariable(nameNode, typeNode) {
    let sym = this.symbols[nameNode.$value]
    if(sym != null) {
      let pi = this.positionInfo(sym.pos)
      throw this.error(`symbol '${nameNode.$value}' already defined here: (${pi.link})`, nameNode.$pos)
    }

    this.symbols[nameNode.$value] = new Variable(this.analyzer, this, nameNode, typeNode)
  }

  toJSON() {
    return this.symbols
  }
}
class Function {
  constructor(analyzer, parent, pos, name, args, ret) {
    this.analyzer = analyzer
    this.parent = parent
    this.name = name
    this.pos = pos
    this.args = args
    this.ret = ret

    this.symbols = {}
  }

  error(msg, pos) {
    return this.analyzer.srcObj.error(msg, pos)
  }
  positionInfo(pos) {
    return this.analyzer.srcObj.positionInfo(pos)
  }

  registerVariable(nameNode, typeNode) {
    let sym = this.symbols[nameNode.$value]
    if(sym != null) {
      let pi = this.positionInfo(sym.pos)
      throw this.error(`symbol '${nameNode.$value}' already defined here: (${pi.link})`, nameNode.$pos)
    }

    this.symbols[nameNode.$value] = new Variable(this.analyzer, this, nameNode, typeNode)
  }

  toJSON() {
    return {
      LINK: this.positionInfo(this.pos).link,
      args: this.args,
      ret: this.ret,
      body: this.symbols
    }
  }
}

class Variable {
  constructor(analyzer, parent, nameNode, typeNode) {
    this.analyzer = analyzer
    this.parent = parent
    this.nameNode = nameNode
    this.typeNode = typeNode
  }

  positionInfo(pos) {
    return this.analyzer.srcObj.positionInfo(pos)
  }

  toJSON() {
    return {
      type: this.typeNode.$value,
      LINK: this.positionInfo(this.nameNode.$pos).link
    }
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
      this.ruleMap[ast.$type].analyze2(this, ast)
    } catch(e) {
      console.log(`analyze2 failed for '${ast.$type}'`)
      throw e
    }
  }

  pushFunction(nameNode, argsNode, retNode) {
    this.curScope = this.curScope.pushFunction(nameNode, argsNode, retNode)
  }
  pop() {
    this.curScope = this.curScope.parent
  }

  registerVariable(nameNode, typeNode) {
    this.curScope.registerVariable(nameNode, typeNode)
  }

}

// @ts-ignore
module.exports = {
  Analyzer
}