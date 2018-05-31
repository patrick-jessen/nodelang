let Parser = require("./parser").Parser
let Named = require("./parser").Named

function parseModule(p) {
  let module = p.any(new Named("statement", parseStatement))
  p.done()

  return {
    $type: "Module",
    $value: module,
  }
}

function parseStatement(p) {
  p.one(/ *|\t*/)
  let statement = p.one(
    parseVariableDecl,
    parseFunctionCall,
    parseFunctionDecl,
    parseNewLine,
  )

  if(statement == null) return
  return {
    $type: "Statement",
    $value: statement,
  }
}


function parseVariableDecl(p) {
  p.one(`var `)
  let ident = p.one(parseIdentifier)
  let val = p.opt(p => {
    p.one(` = `)
    return p.one(parseStringLiteral)
  })

  return {
    $type: "VariableDecl",
    $value: {
      var: ident,
      val: val,
    }
  }
}

function parseFunctionCall(p) {
  let func = p.one(parseIdentifier)
  p.one(`(`)
  let args = p.opt(parseCallArgumentList)
  p.one(`)`)

  return {
    $type: "FunctionCall",
    $value: {
      func: func,
      args: args,
    }
  }
}

function parseFunctionDecl(p) {
  p.one("func ")
  let func = p.one(parseIdentifier)
  p.one("(")
  p.one(")")
  let ret = p.opt(p => {
    p.one(" -> ")
    return p.one(parseIdentifier)
  })
  p.one(/^ {/)
  p.one(parseNewLine)
  let block = p.one(parseBlock)
  p.one("}")

  return {
    $type: "FunctionDecl",
    $value: {
      func: func,
      ret: ret,
      block: block,
    }
  }
}

function parseNewLine(p) {
  p.one(new Named("newline", /^\r?\n/))
}

function parseIdentifier(p) {
  return p.one(new Named('identifier', /^[a-zA-Z][a-zA-Z0-9]+/))
}

function parseStringLiteral(p) {
    p.one(new Named("string", `"`))
    let value = p.one(/^[^(")]*/)
    p.one(`"`)

    return {
      $type: "StringLiteral",
      $value: value,
    }
}

function parseCallArgumentList(p) {
  let first = p.one(parseCallArgument)
  let rest = p.any(p => {
    p.one(/, ?/)
    return p.one(new Named("argument", parseCallArgument))
  })

  return [first, ...rest]
}


function parseBlock(p) {
  return p.any(parseStatement)
}

function parseCallArgument(p) {
  return p.one(parseStringLiteral, parseIdentifier)
}

let parser = new Parser("src.j")
try {
  let ast = parser.one(parseModule)
  console.log(JSON.stringify(ast, null, 2))
} catch(e) {
  console.log(e)
}


