// @ts-check

let {Parser, Named} = require("./lib/parser")
let {Source, Error} = require("./lib/source")

let objMap = {}

/**
 * @param {String} name 
 * @param {{parse:((p:Parser) => *), generate?:*, $type?:String}} obj 
 */
function register(name, obj) {
  obj.$type = name
  objMap[name] = obj
  return obj
}

function g(name) {
  return objMap[name]
}


class Scope {
  constructor(srcObj, name) {
    this.srcObj = srcObj
    this.name = name

    this.variables = {}
    this.functions = {}
    this.types = {}
  }

  regVar(ast, name) {
    if(this.variables[name] != null)
      throw parser.error(`variable '${name}' already defined`, ast.$pos)

    this.variables[name] = ast.$pos
  }

  getVar(ast, name) {
    if(this.variables[name] == null)
      throw parser.error(`variable '${name}' not defined`, ast.$pos)
  }

  regFunc(ast, name) {
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
  constructor(srcObj) {
    this.srcObj = srcObj
    this.scopes = []
    this.currScope
  }

  generate(ast) {
    return objMap[ast.$type].generate(this, ast.$value)
  }

  regVar(ast, name) {
    this.currScope.regVar(ast, name)
  }
  getVar(ast, name) {
    this.traverseScopes(s => s.getVar(ast, name))
  }

  regType(ast, name) {
    this.currScope.regType(ast, name)
  }
  getType(ast, name) {
    this.traverseScopes(s => s.getType(ast, name))
  }

  regFunc(ast, name) {
    this.currScope.regFunc(ast, name)
  }
  getFunc(ast, name) {
    this.traverseScopes(s => s.getFunc(ast, name))
  }

  pushScope(name) {
    let s = new Scope(this.srcObj, name)
    this.scopes.push(s)
    this.currScope = s
  }
  popScope() {
    this.scopes.pop()
    this.currScope = this.scopes[this.scopes.length - 1]
  }

  traverseScopes(fn) {
    for(let i = this.scopes.length - 1; i >= 0; i--) {
      try {
        fn(this.scopes[i])
        return
      } catch(e) {
        if(i == 0) throw e
      }
    }
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
      commentObj,
      blockCommentObj,
      importObj,
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
let commentObj = register("comment", {
  parse(p) {
    p.one("//")
    p.one(/^.*/)
  }
})
let blockCommentObj = register("blockComment", {
  parse(p) {
    let m = p.one("/*")
    let level = 1

    while(level > 0) {
      m = p.one(new Named("*/", /\/\*|\*\//))
      if(m.$value == "/*") level++
      else level--
    }
  }
})


////////////////////////////////////////////////////////////////////////////////

let importObj = register("import", {
  parse(p) {
    p.one("import ")
    p.one(`"`)
    let src = p.one(/^[^\r\n"]*/)
    p.one(`"`)
    p.loadFile(src.$value + ".j")
  },
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
    if(ast.var.$value.module != null)
      throw parser.error("cannot declare variable on another module", ast.var.$value.symbol.$pos)

    g.regVar(ast.var.$value.symbol, g.generate(ast.var))
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
    // if(ast.ret) {
    //   g.getType(ast.ret, g.generate(ast.ret))
    // }
    g.regFunc(ast.func, g.generate(ast.func))

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
    g.getFunc(ast.func.$value.symbol, g.generate(ast.func))
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
    let module = p.opt(/^[a-z]+\./)
    let symbol = p.one(new Named('identifier', /^[a-zA-Z][a-zA-Z0-9]*/))
    return {
      module: module,
      symbol: symbol,
    }
  },

  generate(prog, ast) {
    return ast.symbol.$value
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


let source = new Source("src.j")
let parser = new Parser(source)
let generator = new Generator(source)

console.log("PARSING.................")
let ast = parser.one(objMap["root"])
// console.log(JSON.stringify(ast, null, 2))

console.log("GENERATE................")
generator.generate(ast)
// console.log(JSON.stringify(generator, null, 2))

