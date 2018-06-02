// @ts-check

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

  pushFunction(pos, name) {
    let sym = this.symbols[name]
    if(sym != null) {
      let pi = this.positionInfo(sym.pos)
      throw this.error(`symbol '${name}' already defined here: (${pi.link})`, pos)
    }
    
    sym = new Function(this.analyzer, this, name, pos)
    this.symbols[name] = sym
    return sym
  }

  registerVariable(pos, name) {
    let sym = this.symbols[name]
    if(sym != null) {
      let pi = this.positionInfo(sym.pos)
      throw this.error(`symbol '${name}' already defined here: (${pi.link})`, pos)
    }

    this.symbols[name] = new Variable(this.analyzer, this, name, pos)
  }

  toJSON() {
    return this.symbols
  }
}
class Function {
  constructor(analyzer, parent, name, pos) {
    this.analyzer = analyzer
    this.parent = parent
    this.name = name
    this.pos = pos

    this.symbols = {}
  }

  error(msg, pos) {
    return this.analyzer.srcObj.error(msg, pos)
  }
  positionInfo(pos) {
    return this.analyzer.srcObj.positionInfo(pos)
  }

  registerVariable(pos, name) {
    let sym = this.symbols[name]
    if(sym != null) {
      let pi = this.positionInfo(sym.pos)
      throw this.error(`symbol '${name}' already defined here: (${pi.link})`, pos)
    }

    this.symbols[name] = new Variable(this.analyzer, this, name, pos)
  }

  toJSON() {
    return {
      LINK: this.positionInfo(this.pos).link,
      body: this.symbols
    }
  }
}

class Variable {
  constructor(analyzer, parent, name, pos) {
    this.analyzer = analyzer
    this.parent = parent
    this.name = name
    this.pos = pos
  }

  positionInfo(pos) {
    return this.analyzer.srcObj.positionInfo(pos)
  }

  toJSON() {
    return this.positionInfo(this.pos).link
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

  pushFunction(pos, name) {
    this.curScope = this.curScope.pushFunction(pos, name)
  }
  pop() {
    this.curScope = this.curScope.parent
  }

  registerVariable(pos, name) {
    this.curScope.registerVariable(pos, name)
  }

}

// @ts-ignore
module.exports = {
  Analyzer
}