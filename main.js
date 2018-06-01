// @ts-check

// @ts-ignore
let {Named} = require("./lib/parser")
// @ts-ignore
let lib = require("./lib/lib")


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

lib.registerRule("root", {
  parse(p) {
    let stmts = p.any(statementObj)
    p.done()
    return stmts
  },

  analyze(a, ast) {
    a.pushScope("global")
    ast.$value.map(stmt => a.analyze(stmt))
    a.popScope()
  }
})

////////////////////////////////////////////////////////////////////////////////

let statementObj = lib.registerRule("statement", {
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

  analyze(g, ast) {
    g.analyze(ast.$value)
  }
})

////////////////////////////////////////////////////////////////////////////////
let commentObj = lib.registerRule("comment", {
  parse(p) {
    p.one("//")
    p.one(/^.*/)
  }
})
let blockCommentObj = lib.registerRule("blockComment", {
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

let importObj = lib.registerRule("import", {
  parse(p) {
    p.one("import ")
    p.one(`"`)
    let src = p.one(/^[^\r\n"]*/)
    p.one(`"`)
    p.loadFile(src.$value + ".j")
  },
})
////////////////////////////////////////////////////////////////////////////////

let variableDeclObj = lib.registerRule("variableDecl", {
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

  analyze(a, ast) {
    a.registerVariable(ast.$value.var, ast.$value.val)
  }
})

////////////////////////////////////////////////////////////////////////////////

let functionDeclObj = lib.registerRule("functionDecl", {
  parse(p) {
    p.one("func ")
    let name = p.one(identifierObj)
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
      name: name,
      args: args,
      ret: ret,
      block: block,
    }
  },

  analyze(a, ast) {
    a.registerFunction(
      ast.$value.name,
      ast.$value.ret,
    )

    a.pushScope(ast.$value.name.$value.$value)
    a.analyze(ast.$value.block)
    a.popScope()
  }
})

////////////////////////////////////////////////////////////////////////////////

let functionCallObj = lib.registerRule("functionCall", {
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

  analyze(a, ast) {
    a.expectFunction(ast.$value.func)
    // g.getFunc(ast.func.$value.symbol, g.generate(ast.func))
    // g.generate(ast.args)
  }
})

////////////////////////////////////////////////////////////////////////////////

let argumentListObj = lib.registerRule("argumentList", {
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

let newLineObj = lib.registerRule("newLine", {
  parse(p) {
    p.one(new Named("newline", /^\r?\n/))
  }
})

////////////////////////////////////////////////////////////////////////////////

let identifierObj = lib.registerRule("identifier", {
  parse(p) {
    return p.one(new Named('identifier', /^[a-zA-Z][a-zA-Z0-9]*/))
  },

})

////////////////////////////////////////////////////////////////////////////////

let stringLiteralObj = lib.registerRule("stringLiteral", {
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

let callArgumentListObj = lib.registerRule("callArgumentList", {
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

let blockObj = lib.registerRule("block", {
  parse(p) {
    return p.any(statementObj)
  },

  analyze(a, ast) {
    ast.$value.map(stmt => a.analyze(stmt))
  }
})

////////////////////////////////////////////////////////////////////////////////

let callArgumentObj = lib.registerRule("callArgument", {
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

lib.run("src.j")