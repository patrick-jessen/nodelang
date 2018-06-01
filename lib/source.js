// @ts-check

// @ts-ignore
let fs = require("fs")

class Error {
  /**
   * @param {Source} src 
   * @param {Number} pos 
   * @param {String} msg 
   */
  constructor(src, pos, msg) {
    this.src = src
    this.pos = pos
    this.msg = msg
  }

  /**
   * @returns {String}
   */
  toString() {
    let posInfo = this.src.positionInfo(this.pos)
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

class Source {

  /**
   * @param {String[]} files 
   */
  constructor(...files) {
    this.files = []
    this.totalLen = 0
    this.loadFiles(...files)
  }

  /**
   * @param {String[]} names 
   */
  loadFiles(...names) {
    for(let i = 0; i < arguments.length; i++) {
      let f = new File(names[i])
      this.files.push(f)
      this.totalLen += f.src.length
    }
  }

  /**
   * @return {String}
   */
  join() {
    return this.files.map(f => f.src).join("\n")
  }

  /**
   * @param {Number} pos 
   * @return {{file:String, line:String, lineNo:Number, columnNo:Number, link:String}}
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
}

// @ts-ignore
module.exports = {
  Source,
  Error
}