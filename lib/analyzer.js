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
  constructor(analyzer, scope, nameNode, typeNode, valueNode) {
    this.analyzer = analyzer
    this.scope = scope
    this.nameNode = nameNode
    this.typeNode = typeNode
    this.valueNode = valueNode

    switch(this.valueNode.$type) {
      case "stringLiteal":
    }
  }

  positionInfo(pos) {
    return this.analyzer.srcObj.positionInfo(pos)
  }

  toJSON() {
    return {
      type: this.typeNode,
      value: this.valueNode,
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
    this.curScope = this.curScope.pushFunction(nameNode, argsNode, retNode)
  }
  pop() {
    this.curScope = this.curScope.parent
  }

  registerVariable(nameNode, typeNode, valueNode) {
    let sym = this.curScope.symbols[nameNode.$value]
    if(sym != null) {
      let pi = this.srcObj.positionInfo(sym.pos)
      throw this.srcObj.error(`symbol '${nameNode.$value}' already defined here: (${pi.link})`, nameNode.$pos)
    }

    this.curScope.symbols[nameNode.$value] = new Variable(this, this.curScope, nameNode, typeNode, valueNode)
  }

  expectVariable(nameNode) {

  }

}

// @ts-ignore
module.exports = {
  Analyzer
}