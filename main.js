let Parser = require("./parser").Parser
let Named = require("./parser").Named

class Module {
  parse(p) {
    this.module = p.any(new Named("statement", new Statement))
    p.done()
  }
}

class FunctionDecl {
  parse(p) {
    p.one("func ")
    this.function = p.one(new Identifier)
    p.one("(")
    p.one(")")
    this.return = p.opt(p => {
      p.one(" -> ")
      return p.one(new Identifier)
    })
    p.one(/^ {/)
    p.one(new NewLine)
    this.block = p.one(new Block)
    p.one("}")
  }
}

class Block {
  parse(p) {
    this.block = p.any(new Statement)
  }
}

class Statement {
  parse(p) {
    p.one(/ *|\t*/)
    this.statement = p.one(
      new VariableDecl,
      new FunctionCall,
      new FunctionDecl,
      new NewLine
    )
  }
}

class NewLine {
  constructor() {
    this.skip = true
  }
  parse(p) {
    p.one(new Named("newline", /^\r?\n/))
  }
}

class VariableDecl {
  parse(p) {
    p.one(`var `)
    this.var = p.one(new Identifier)
    this.val = p.opt(p => {
      p.one(` = `)
      return p.one(new StringLiteral)
    })
  }
}

class Identifier {
  parse(p) {
    this.name = p.one(new Named('identifier', /^[a-zA-Z][a-zA-Z0-9]+/))
  }
}

class FunctionCall {
  parse(p) {
    this.function = p.one(new Identifier)
    p.one(`(`)
    this.arguments = p.opt(new CallArgumentList)
    p.one(`)`)
  }
}

class CallArgumentList {
  parse(p) {
    let first = p.one(new CallArgument)
    let rest = p.any(p => {
      p.one(/, ?/)
      return p.one(new Named("argument", new CallArgument))
    })

    this.list = [first, ...rest]
  }
}

class CallArgument {
  parse(p) {
    this.arg = p.one(new StringLiteral, new Identifier)
  }
}

class StringLiteral {
  parse(p) {
    p.one(new Named("string", `"`))
  this.value = p.one(/^[^(")]*/)
    p.one(`"`)
  }
}

let parser = new Parser("src.j")
try {
  let ast = parser.one(new Module)
  console.log(JSON.stringify(ast, null, 2))
} catch(e) {
  console.log(e.toString())
}


