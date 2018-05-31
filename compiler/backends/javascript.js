

let generators = {
  Module(ast) {
    let out = "";
    for(let i = 0; i < ast.$value.length; i++) {
      out += generate(ast.$value[i])
    }
    return out
  },

  Statement(ast) {
    return generate(ast.$value)
  },

  FunctionDecl(ast) {
    return `function ${generate(ast.$value.func)}() {
${ast.$value.block.map(s => `  ${generate(s)};`).join("\n")}
}`
  },

  Identifier(ast) {
    return ast.$value
  },

  VariableDecl(ast) {
    let out = `let ${generate(ast.$value.var)}`
    if(ast.$value.val != null)
      out += ` = ${generate(ast.$value.val)}`

    return out
  },

  StringLiteral(ast) {
    return `"${ast.$value}"`
  },

  FunctionCall(ast) {
    let args = ast.$value.args.map(a => generate(a)).join(", ")
    return `${generate(ast.$value.func)}(${args})`
  }
  
}


function generate(ast) {
  try {
  return generators[ast.$type](ast)
  } catch(e) {
    console.log("-------- ast.$type =", ast.$type)
    throw e
  }
}

function backend(ast) {
  return generate(ast)
}

module.exports = {
  backend,
}