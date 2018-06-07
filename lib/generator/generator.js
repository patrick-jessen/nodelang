// @ts-check

let pe = require("./pe")

class Program {
  constructor() {
    this.dataCount = 0
    this.data = []
    this.dataMap = {}
  }

  getStringData(str) {
    let dat = this.dataMap[str]
    if(dat != null) return dat

    let id = `data_${this.dataCount++}`
    this.data.push({
      identifier: id,
      data: str
    })
    this.dataMap[str] = id
    return id
  }
  
  generate(mods) {
    let data = this.data.map(d => `  ${d.identifier} db "${d.data}",0`)

    return [
      `.data`,
      `${data}`,
      ``,
      `.code`,
      `main proc`,
      `  PUSH rbp`,
      `  MOV rbp, rsp`,
      `  SUB rsp, 32`,
      `  CALL fn_main`,
      `  LEAVE`,
      `  RET`,
      `main endp`,
      ``,
      `${mods.join('\n')}`,
      `end`
    ].join("\n")
  }
}

class Function {
  constructor(prog) {
    this.prog = prog
    this.stackSize = 0
    this.stackVars = {}
  }

  generate(ast) {
    let stmts = ast.body.map(stmt => this.generateStatement(stmt))
    let stackSize = 32
    if(this.stackSize > 32)
      stackSize = this.stackSize

    return [
      `fn_${ast.name.value}:`,
      `  PUSH rbp`,
      `  MOV rbp, rsp`,
      `  SUB rsp, ${stackSize}`,
      ``,
      `  ${stmts.join('\n').replace(/\n/g, "\n  ")}`,
      ``,
      `  LEAVE`,
      `  RET\n\n`
    ].join('\n')
  }



  generateStackVar(name) {
    let v = this.stackVars[name]
    return `[rsp+${v}]`
  }

  generateAdd(ast) {
    let lhs = this.generateExpression(ast.lhs)
    let rhs = this.generateExpression(ast.rhs)

    return [
      `MOV rax, ${lhs}`,
      `ADD rax, ${rhs}`
    ].join("\n")
  }

  generateExpression(ast) {
    if(ast.$type == "add")
      return this.generateAdd(ast)
    if(ast.$type == "INTEGER")
      return ast.value
    if(ast.$type == "STRING") {
      return `LEA rax, ${this.prog.getStringData(ast.value)}`
    }
  }

  generateVariableDecl(ast) {
    this.stackSize += 8
    this.stackVars[ast.name.value] = this.stackSize

    if(ast.value != null) {
      return [
        `${this.generateExpression(ast.value)}`,
        `MOV QWORD PTR ${this.generateStackVar(ast.name.value)}, rax`
      ].join('\n')
    }
    return `MOV QWORD PTR ${this.generateStackVar(ast.name.value)}, 0`
  }

  generateFunctionCall(ast) {
    let args = ast.args.map(a => `PUSH QWORD PTR ${this.generateStackVar(a.value)}`)

    return [
      `${args}`,
      `CALL fn_${ast.name.value}`
    ].join('\n')
  }

  generateReturn(ast) {
    return `MOV RAX, ${this.generateExpression(ast.value)}`
  }

  generateStatement(ast) {
    if(ast.$type == "variableDecl")
      return this.generateVariableDecl(ast)
    if(ast.$type == "functionCall")
      return this.generateFunctionCall(ast)
    if(ast.$type == "return")
      return this.generateReturn(ast)
  }
}


function run(ast) {
  let mods = []

  let prog = new Program

  for(let a of ast) {
    if(a.$type == "functionDecl")
      mods.push((new Function(prog)).generate(a))
  }

  pe()

  return prog.generate(mods)
}

// @ts-ignore
module.exports = {
  run
}