// @ts-check

/**
 * @typedef {{file:String, line:String, lineNo:Number, columnNo:Number, link:String}} PosInf
 */

// @ts-ignore
let fs = require("fs")
// @ts-ignore
let lexer = require("./lexer/lexer")
// @ts-ignore
let parser = require("./parser/parser")
// @ts-ignore
let generator = require("./generator/generator")

class Error {
  /**
   * @param {Module} mod 
   * @param {Number} pos 
   * @param {String} msg 
   */
  constructor(mod, pos, msg) {
    this.mod = mod
    this.pos = pos
    this.msg = msg
  }

  /**
   * @returns {String}
   */
  toString() {
    let posInfo = this.mod.positionInfo(this.pos)
    let arrow = " ".repeat(posInfo.columnNo) + "^"

    return `ERROR: ${this.msg}\t${posInfo.link}\n` + 
           `\t${posInfo.line}\n` + 
           `\t${arrow}`
  }
}

class File {
  /**
   * @param {String} name 
   */
  constructor(name) {
    this.name = name
    this.src = fs.readFileSync(name).toString()
  }
}

class Module {
  /**
   * @param {String} dir 
   */
  constructor(dir, importHandler) {
    try {
      this.files = fs.readdirSync(dir)
        .filter(f => f.endsWith(".j"))
        .map(f => new File(`${dir}/${f}`))
    } catch(e) {
      throw `failed to load module ${dir}.\n${e}`
    }

    this.source = this.files.map(f => f.src).join("\n")
    this.importHandler = importHandler
  }

  /**
   * @param {Number} pos 
   * @return {PosInf}
   */
  positionInfo(pos) {
    let iter = 0

    let ret = {
      file: "",
      line: "",
      lineNo: 0,
      columnNo: 0,
      link: "",
    }

    for(let f = 0; f < this.files.length; f++) {
      let file = this.files[f]

      if(iter + file.src.length >= pos) {
        ret.file = file.name
        let lines = file.src.split("\n")
        
        for(let l = 0; l < lines.length; l++) {
          let len = lines[l].length
          if(iter + len >= pos) {
            ret.line = lines[l]
            ret.lineNo = l + 1 // 1-based (not 0)
            ret.columnNo = pos - iter
            ret.link = `${ret.file}:${ret.lineNo}:${ret.columnNo+1}`
            return ret
          }
          iter += len + 1 // +1 due to \n removed by split
        }
      }
      iter += file.src.length + 1 // +1 due to \n between files
    }

    throw `invalid position`
  }

  /**
   * @param {String} msg 
   * @param {Number} pos
   * @returns {Error}
   */
  error(msg, pos) {
    return new Error(this, pos, msg)
  }

  process() {
    console.log("LEXING -----------------------")
    let tokens = lexer.run(this.source, (msg,pos) => this.error(msg, pos))
    console.log(tokens)

    console.log("PARSING ----------------------")
    let ast = parser.run(tokens, (msg,pos) => this.error(msg, pos), this.importHandler)
    console.log(JSON.stringify(ast, null, 2))

    console.log("GENERATING -------------------")
    let asm = generator.run(ast)
    console.log(asm)
  }
}

// @ts-ignore
module.exports = {
  Module
}