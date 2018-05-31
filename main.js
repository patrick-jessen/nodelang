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

class Generator {
  constructor() {
    this.variables = {}
  }

  generate(ast) {
    return objMap[ast.$type].generate(this, ast.$value)
  }

  defVar(name) {
    if(this.variables[name] != null)
      throw `variable '${name}' already defined`

    this.variables[name] = true
  }

  getVar(name) {
    if(this.variables[name] == null)
      throw `variable '${name}' not defined`
  }
}

function gen(prog, ast) {
  return g(ast.$type).generate(prog, ast.$value)
}

////////////////////////////////////////////////////////////////////////////////

register("root", {
  parse(p) {
    let stmts = p.any(statementObj)
    p.done()
    return stmts
  },

  generate(g, ast) {
    ast.map(a => g.generate(a))
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
    g.defVar(g.generate(ast.var))
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

  generate() {

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

  generate() {
    
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
  }
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
  }
})

////////////////////////////////////////////////////////////////////////////////

let blockObj = register("block", {
  parse(p) {
    return p.any(statementObj)
  }
})

////////////////////////////////////////////////////////////////////////////////

let callArgumentObj = register("callArgument", {
  parse(p) {
    return p.one(stringLiteralObj, identifierObj)
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
  console.log(gen)

  // console.log("COMPILING...............")
  // let compiled = compile(ast, backend)

  // console.log("EXECUTING...............")
  // console.log(compiled)
  // jsVM(compiled)
} catch(e) {
  console.log(e)
}

