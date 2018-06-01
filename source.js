let fs = require("fs")

class Error {
  constructor(src, pos, msg) {
    this.src = src
    this.pos = pos
    this.msg = msg
  }

  toString() {
    let posInfo = this.src.positionInfo(this.pos)
    let fileRef = `${posInfo.file}:${posInfo.lineNo}:${posInfo.columnNo+1}`
    let arrow = " ".repeat(posInfo.columnNo) + "^"

    return `ERROR: ${this.msg}\t./${fileRef}\n` + 
           `\t${posInfo.line}\n` + 
           `\t${arrow}`
  }
}

class File {
  constructor(name) {
    this.name = name
    this.src = fs.readFileSync(name).toString()
  }
}

class Source {
  constructor(...files) {
    this.files = []
    this.totalLen = 0
    this.loadFiles(...files)
  }

  loadFiles(...names) {
    for(let i = 0; i < arguments.length; i++) {
      let f = new File(names[i])
      this.files.push(f)
      this.totalLen += f.src.length
    }
  }

  join() {
    return this.files.map(f => f.src).join("\n")
  }

  positionInfo(pos) {
    let iter = 0

    let ret = {
      file: "",
      line: "",
      lineNo: 0,
      columnNo: 0,
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
            return ret
          }
          iter += len + 1 // +1 due to \n removed by split
        }
      }
      iter += file.src.length + 1 // +1 due to \n between files
    }

    throw `invalid position`
  }
}

module.exports = {
  Source,
  Error
}