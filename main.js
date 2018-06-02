// @ts-check

// @ts-ignore
let {Named} = require("./lib/parser")
// @ts-ignore
let lib = require("./lib/lib")

////////////////////////////////////////////////////////////////////////////////

lib.registerRule("root", {
  parse(p) {
    return p.any(statementObj)
  },

  analyze(a, ast) {
    ast.$value.map(stmt => a.analyze(stmt))
  }
})

////////////////////////////////////////////////////////////////////////////////

let statementObj = lib.registerRule("statement", {
  parse(p) {
    p.one(/[ \t]*/)
    let statement = p.one(
      commentObj,
      blockCommentObj,
      importObj,
      variableDeclObj,
      functionDeclObj,
      functionCallObj,
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
    p.one(/^[^\n]*\n/)
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
    let src = p.one(/^[a-z\/]*/)
    p.one(`"`)
    p.one(newLineObj)
    lib.loadModule(p, src.$value)
  },
})

////////////////////////////////////////////////////////////////////////////////

let variableDeclObj = lib.registerRule("variableDecl", {
  parse(p) {
    p.one(`var `)
    let ident = p.one(identifierObj)
    let type = p.opt(p => {
      p.one(/^[ \t]*/)
      return p.one(typeObj)
    })
    let value = p.opt(p => {
      p.one(/^[ \t]*=[ \t]*/)
      return p.one(rhsObj)
    })

    if(type == null && value == null)
      throw p.error("expected type and/or assignment", p.iter)

    return {
      name: ident,
      value: value,
      type: type
    }
  },

  analyze(a, ast) {
    let name = ast.$value.name.$value
    let type
    let value

    if(ast.$value.type != null)
      type = ast.$value.type.$value
    if(ast.$value.value != null) {
      value = ast.$value.value.$value

      a.analyze(value)
    }
    
    a.declareVariable(name, type)
    a.assignVariable(name, value)
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
      return p.one(typeObj)
    })
    p.one(/^ {/)
    p.one(newLineObj)
    let block = p.one(blockObj)
    p.one(/^ *}/)

    return {
      name: name,
      args: args,
      ret: ret,
      block: block,
    }
  },

  analyze(a, ast) {
    let ident = ast.$value.name.$value

    a.pushFunction(ident, null, null)
    a.analyze(ast.$value.block)
    a.pop()
  }
})

////////////////////////////////////////////////////////////////////////////////

let rhsObj = lib.registerRule("rhs", {
  parse(p) {
    return p.one(new Named("expression", p => p.one(
      stringLiteralObj,
      floatLiteralObj,
      integerLiteralObj,
      identifierObj
    )))
  }
})

////////////////////////////////////////////////////////////////////////////////

let functionCallObj = lib.registerRule("functionCall", {
  parse(p) {
    return p.one(localFunctionCallObj, remoteFunctionCallObj)
  },
  analyze(a, ast) {
    a.analyze(ast.$value)
  }
})

let localFunctionCallObj = lib.registerRule("localFunctionCall", {
  parse(p) {
    let func = p.one(identifierObj)
    p.one(`(`)
    let args = p.opt(callArgumentListObj)
    p.one(`)`)

    return {
      func: func,
      args: args,
    }
  }
})

let remoteFunctionCallObj = lib.registerRule("remoteFunctionCall", {
  parse(p) {
    let module = p.one(/^([a-z]+)\./)
    let func = p.one(identifierObj)
    p.one(`(`)
    let args = p.opt(callArgumentListObj)
    p.one(`)`)

    return {
      module: module,
      func: func,
      args: args,
    }
  }
})

////////////////////////////////////////////////////////////////////////////////

let argumentListObj = lib.registerRule("argumentList", {
  parse(p) {
    let first = p.one(identifierObj)
    p.one(" ")
    let firstType = p.one(typeObj)

    let rest = p.any(p => {
      p.one(/^, ?/)
      let arg = p.one(new Named("argument", identifierObj))
      p.one(" ")
      let argType = p.one(typeObj)

      return {
        name: arg,
        type: argType
      }
    })

    let firstObj = {
      name: first,
      type: firstType
    }

    return [firstObj, ...rest]
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
  analyze(a, ast) {
    a.expectVariable(ast.$value)
  }
})

////////////////////////////////////////////////////////////////////////////////

let stringLiteralObj = lib.registerRule("stringLiteral", {
  parse(p) {
    p.one(new Named("string", `"`))
    let value = p.one(/^[^("\r\n)]*/)
    p.one(`"`)

    return value
  },

})
let integerLiteralObj = lib.registerRule("integerLiteral", {
  parse(p) {
    return p.one(/^(0|[1-9][0-9]*)/)
  },
  analyze(a, ast){}
})
let floatLiteralObj = lib.registerRule("floatLiteral", {
  parse(p) {
    return p.one(/^(?:0|([1-9][0-9]+))\.[0-9]+/)
  }
})

////////////////////////////////////////////////////////////////////////////////

let typeObj = lib.registerRule("type", {
  parse(p) {
    return p.one(new Named("type", /^[a-zA-Z]+/))
  }
})

////////////////////////////////////////////////////////////////////////////////

let callArgumentListObj = lib.registerRule("callArgumentList", {
  parse(p) {
    let first = p.one(callArgumentObj)
    let rest = p.any(p => {
      p.one(/^, ?/)
      return p.one(new Named("argument", callArgumentObj))
    })

    return [first, ...rest]
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
  }
})

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////


lib.run("./src")