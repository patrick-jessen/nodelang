let Parser = require("./parser").Parser
let Named = require("./parser").Named

let compile = require("./compiler/compiler").compile
let backend = require("./compiler/backends/javascript").backend
let jsVM = require("./vm/javascript").vm


let objMap = {}
function register(name, obj) {
  obj.$type = name
  objMap[name] = obj
  return obj
}

function g(name) {
  return objMap[name]
}

class Scope {
  constructor(name) {
    this.name = name
    this.variables = {}
    this.functions = {
      "print": 0
    }
  }

  defVar(ast, name) {
    if(this.variables[name] != null)
      throw parser.error(`variable '${name}' already defined`, ast.$pos)

    this.variables[name] = ast.$pos
  }

  getVar(ast, name) {
    if(this.variables[name] == null)
      throw parser.error(`variable '${name}' not defined`, ast.$pos)
  }

  defFunc(ast, name) {
    if(this.functions[name] != null)
      throw parser.error(`function '${name}' already defined`, ast.$pos)

    this.functions[name] = ast.$pos
  }

  getFunc(ast, name) {
    if(this.functions[name] == null)
      throw parser.error(`function '${name}' not defined`, ast.$pos)
  }
}

class Generator {
  constructor() {
    this.scopesDone = []
    this.scopes = []
    this.types = {
      "int":0
    }
  }

  generate(ast) {
    return objMap[ast.$type].generate(this, ast.$value)
  }

  defVar(ast, name) {
    this.scopes[this.scopes.length -1].defVar(ast, name)
  }
  getVar(ast, name) {
    for(let i = this.scopes.length - 1; i >= 0; i--) {
      try {
        this.scopes[i].getVar(ast, name)
        break
      } catch(e) {
        if(i == 0) throw e
      }
    }
  }
  getType(ast, name) {
    if(this.types[name] == null)
      throw parser.error(`expected a type`, ast.$pos)
  }

  defFunc(ast, name) {
    this.scopes[this.scopes.length -1].defFunc(ast, name)
  }
  getFunc(ast, name) {
    for(let i = this.scopes.length - 1; i >= 0; i--) {
      try {
        this.scopes[i].getFunc(ast, name)
      } catch(e) {
        if(i == 0) throw e
      }
    }
  }



  pushScope(name) {
    this.scopes.push(new Scope(name))
  }
  popScope() {
    this.scopesDone.push(this.scopes.pop())
  }
}

////////////////////////////////////////////////////////////////////////////////

register("root", {
  parse(p) {
    let stmts = p.any(statementObj)
    p.done()
    return stmts
  },

  generate(g, ast) {
    g.pushScope("global")
    ast.map(a => g.generate(a))
    g.popScope()
  }
})

////////////////////////////////////////////////////////////////////////////////

let statementObj = register("statement", {
  parse(p) {
    p.one(/ *|\t*/)
    let statement = p.one(
      variableDeclObj,
      functionCallObj,
      functionDeclObj,
      newLineObj,
    )
    return statement
  },

  generate(g, ast) {
    g.generate(ast)
  }
})

////////////////////////////////////////////////////////////////////////////////

let variableDeclObj = register("variableDecl", {
  parse(p) {
    p.one(`var `)
    let ident = p.one(identifierObj)
    let val = p.opt(p => {
      p.one(` = `)
      return p.one(stringLiteralObj)
    })

    return {
      var: ident,
      val: val,
    }
  },

  generate(g, ast) {
    g.defVar(ast.var, g.generate(ast.var))
  }
})

////////////////////////////////////////////////////////////////////////////////

let functionDeclObj = register("functionDecl", {
  parse(p) {
    p.one("func ")
    let func = p.one(identifierObj)
    p.one("(")
    let args = p.opt(argumentListObj)
    p.one(")")
    let ret = p.opt(p => {
      p.one(" -> ")
      return p.one(identifierObj)
    })
    p.one(/^ {/)
    p.one(newLineObj)
    let block = p.one(blockObj)
    p.one("}")

    return {
      func: func,
      args: args,
      ret: ret,
      block: block,
    }
  },

  generate(g, ast) {
    if(ast.ret) {
      g.getType(ast.ret, g.generate(ast.ret))
    }
    g.defFunc(ast.func, g.generate(ast.func))

    g.pushScope(g.generate(ast.func))
    g.generate(ast.block)
    g.popScope()
  }
})

////////////////////////////////////////////////////////////////////////////////

let functionCallObj = register("functionCall", {
  parse(p) {
    let func = p.one(identifierObj)
    p.one(`(`)
    let args = p.opt(callArgumentListObj)
    p.one(`)`)

    return {
      func: func,
      args: args,
    }
  },

  generate(g, ast) {
    g.getFunc(ast.func, g.generate(ast.func))
    g.generate(ast.args)
  }
})

////////////////////////////////////////////////////////////////////////////////

let argumentListObj = register("argumentList", {
  parse(p) {
    let first = p.one(identifierObj)
    let rest = p.any(p => {
      p.one(/, ?/)
      return p.one(new Named("argument", identifierObj))
    })

    return [first, ...rest]
  },


})

////////////////////////////////////////////////////////////////////////////////

let newLineObj = register("newLine", {
  parse(p) {
    p.one(new Named("newline", /^\r?\n/))
  },

  generate() {
    
  }
})

////////////////////////////////////////////////////////////////////////////////

let identifierObj = register("identifier", {
  parse(p) {
    return p.one(new Named('identifier', /^[a-zA-Z][a-zA-Z0-9]*/))
  },

  generate(prog, ast) {
    return ast
  }
})

////////////////////////////////////////////////////////////////////////////////

let stringLiteralObj = register("stringLiteral", {
  parse(p) {
    p.one(new Named("string", `"`))
    let value = p.one(/^[^(")]*/)
    p.one(`"`)

    return value
  },

  generate() {
    
  }
})

////////////////////////////////////////////////////////////////////////////////

let callArgumentListObj = register("callArgumentList", {
  parse(p) {
    let first = p.one(callArgumentObj)
    let rest = p.any(p => {
      p.one(/, ?/)
      return p.one(new Named("argument", callArgumentObj))
    })

    return [first, ...rest]
  },

  generate(g, ast) {
    ast.map(arg => g.generate(arg))
  }
})

////////////////////////////////////////////////////////////////////////////////

let blockObj = register("block", {
  parse(p) {
    return p.any(statementObj)
  },

  generate(g, ast) {
    ast.map(s => g.generate(s))
  }
})

////////////////////////////////////////////////////////////////////////////////

let callArgumentObj = register("callArgument", {
  parse(p) {
    return p.one(stringLiteralObj, identifierObj)
  },

  generate(g, ast) {
    switch(ast.$type) {
      case "identifier":
        g.getVar(ast, g.generate(ast))
    }
  }
})

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////


let parser = new Parser("src.j")
try {
  console.log("PARSING.................")
  let ast = parser.one(objMap["root"])
  console.log(JSON.stringify(ast, null, 2))

  console.log("GENERATE................")
  let gen = new Generator
  gen.generate(ast)
  console.log(JSON.stringify(gen, null, 2))

  // console.log("COMPILING...............")
  // let compiled = compile(ast, backend)

  // console.log("EXECUTING...............")
  // console.log(compiled)
  // jsVM(compiled)
} catch(e) {
  console.log(e.toString())
}

