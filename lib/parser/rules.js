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
      return p.one(rules.expression)
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
    let args = p.opt(rules.callArguments)
    p.one(tokens.PARENT_END)

    return {
      $type: "functionCall",
      name: name,
      args: args,
    }
  }),
  callArguments: rule(p => {
    let first = p.one(rules.expression)
    let rest = p.any(p => {
      p.one(tokens.COMMA)
      return p.one(rules.expression)
    })
    return [first, ...rest]
  }),
  block: rule(p => {
    p.one(tokens.CURL_START)
    p.one(tokens.NEWLINE)
    let stmts = p.any(rules.statement)
    p.one(tokens.CURL_END)

    return stmts
  }),
  expression: rule(p => {
    return p.one(
      rules.add,
      rules.subtract,
      rules.multiply,
      rules.divide,
      rules.parenthesis,
      rules.basicExpression,
    )
  }),
  basicExpression: rule(p => {
    return p.one(
      tokens.IDENTIFIER,
      tokens.STRING,
      tokens.INTEGER,
      tokens.FLOAT,
    )
  }),
  
  parenthesis: rule(p => {
    p.one(tokens.PARENT_START)
    let exp = p.one(rules.expression)
    p.one(tokens.PARENT_END)
    return exp
  }),
  add: rule(p => {
    let lhs = p.one(
      rules.multiply,
      rules.divide,
      rules.parenthesis,
      rules.basicExpression
    )
    p.one(tokens.ADD)
    let rhs = p.one(rules.expression)

    return {
      $type: "add",
      lhs: lhs,
      rhs: rhs
    }
  }),
  subtract: rule(p => {
    let lhs = p.one(
      rules.multiply,
      rules.divide,
      rules.parenthesis,
      rules.basicExpression
    )
    p.one(tokens.SUB)
    let rhs = p.one(rules.expression)

    return {
      $type: "subtract",
      lhs: lhs,
      rhs: rhs
    }
  }),
  multiply: rule(p => {
    let lhs = p.one(
      rules.parenthesis,
      rules.basicExpression
    )
    p.one(tokens.MUL)
    let rhs = p.one(
      rules.multiply,
      rules.divide,
      rules.parenthesis,
      rules.basicExpression
    )

    return {
      $type: "multiply",
      lhs: lhs,
      rhs: rhs
    }
  }),
  divide: rule(p => {
    let lhs = p.one(
      rules.parenthesis,
      rules.basicExpression
    )
    p.one(tokens.DIV)
    let rhs = p.one(
      rules.multiply,
      rules.divide,
      rules.parenthesis,
      rules.basicExpression
    )

    return {
      $type: "divide",
      lhs: lhs,
      rhs: rhs
    }
  })
}

module.exports = rules