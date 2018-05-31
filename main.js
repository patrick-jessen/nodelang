let Parser = require("./parser").Parser
let Named = require("./parser").Named

let compile = require("./compiler/compiler").compile
let backend = require("./compiler/backends/javascript").backend
let jsVM = require("./vm/javascript").vm

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
  let args = p.opt(parseArgumentList)
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
      args: args,
      ret: ret,
      block: block,
    }
  }
}

function parseArgumentList(p) {
  let first = p.one(parseIdentifier)
  let rest = p.any(p => {
    p.one(/, ?/)
    return p.one(new Named("argument", parseIdentifier))
  })

  return [first, ...rest]
}

function parseNewLine(p) {
  p.one(new Named("newline", /^\r?\n/))
}

function parseIdentifier(p) {
  return {
    $type: "Identifier",
    $value: p.one(new Named('identifier', /^[a-zA-Z][a-zA-Z0-9]*/))
  }
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
  console.log("PARSING.................")
  let ast = parser.one(parseModule)
  // console.log(JSON.stringify(ast, null, 2))

  console.log("COMPILING...............")
  let compiled = compile(ast, backend)

  console.log("EXECUTING...............")
  // console.log(compiled)
  jsVM(compiled)
} catch(e) {
  console.log(e)
}

