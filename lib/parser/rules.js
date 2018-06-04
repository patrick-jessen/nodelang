let tokens = require("../lexer/rules")

function rule(func) {
  return {name:null, func}
}

let rules = {
  root: rule(p => {
    return p.any(rules.declStatement)
  }),
  declStatement: rule(p => {
    let stmt = p.one(
      rules.functionDecl,
      rules.variableDecl
    )
    p.one(tokens.NEWLINE)
 
    return stmt
  }),
  statement: rule(p => {
    let stmt = p.one(
      rules.variableDecl,
      rules.functionCall
    )
    p.one(tokens.NEWLINE)

    return stmt
  }),
  variableDecl: rule(p => {
    p.one(tokens.VAR)
    let name = p.one(tokens.IDENTIFIER)
    let type = p.opt(tokens.IDENTIFIER)
    let value = p.opt(p => {
      p.one(tokens.EQUALS)
      return p.one(tokens.STRING)
    })

    return {
      $type: "variableDecl",
      name: name,
      type: type,
      value: value
    }
  }),
  functionDecl: rule(p => {
    p.one(tokens.FUNC)
    let name = p.one(tokens.IDENTIFIER)
    p.one(tokens.PARENT_START)
    p.one(tokens.PARENT_END)
    let body = p.one(rules.block)

    return {
      $type: "functionDecl",
      name: name,
      body: body
    }
  }),
  functionCall: rule(p => {
    let name = p.one(tokens.IDENTIFIER)
    p.one(tokens.PARENT_START)
    p.one(tokens.PARENT_END)

    return {
      $type: "functionCall",
      name: name
    }
  }),
  block: rule(p => {
    p.one(tokens.CURL_START)
    p.one(tokens.NEWLINE)

    let stmts = p.any(rules.statement)

    p.one(tokens.CURL_END)

    return stmts
  })
}

module.exports = rules