let ParseError = require("./source").Error

class Parser {
  constructor(srcObj) {
    this.srcObj = srcObj
    this.source = srcObj.join()

    this.iter = 0
    this.err = null
  }

  loadFile(file) {
    this.srcObj.loadFiles(file)
    this.source = this.srcObj.join()
  }

  done() {
    if(this.iter < this.source.length) {
      throw this.err.toString()
    }
  }

  positionInfo(pos) {
    let lines = this.source.split("\n")
    let lineIter = 0
    let posIter = 0
    let symbolIdx = 0
    let targetPos = pos
    if(targetPos == null)
      targetPos = this.iter

    while(posIter <= targetPos) {
      let line = lines[lineIter]

      if(posIter + line.length >= targetPos) {
        symbolIdx = targetPos - posIter
        break
      }
      posIter += line.length + 1
      lineIter++
    }

    return {
      lineNo: lineIter+1,
      columnNo: symbolIdx,
      line: lines[lineIter],
    }
  }

  print() {
    let pos = this.positionInfo()
    let pre = `${pos.lineNo} |  `
    let arrow = " ".repeat(pre.length + pos.columnNo) + "^"
    console.log(`${pre}${pos.line}\n${arrow}`)
  }

  error(message, pos) {
    if(pos == null) pos = this.iter

    let e = new ParseError(this.srcObj, pos, message)
    if(this.err == null || this.err.pos <= e.pos) {
      this.err = e
    }
    return e
  }

  any(...obj) {
    let ret = []

    while(true) {
      let oldIter = this.iter
      try {
        let res = this.one(...obj)
        if(res != null)
          ret.push(res)
      } catch(e) {
        if(!(e instanceof ParseError)) throw e

        this.iter = oldIter
        return ret
      }
    }
  }

  many(...obj) {
    let ret = []

    while(true) {
      let oldIter = this.iter
      try {
        let res = this.one(...obj)
        if(res != null)
          ret.push(res)
      } catch(e) {
        if(!(e instanceof ParseError)) throw e

        this.iter = oldIter
        if(ret.length == 0)
          throw e
        return ret
      }
    }
  }

  opt(...obj) {
    let oldIter = this.iter
    try {
      return this.one(...obj)
    } catch(e) {
      if(!(e instanceof ParseError)) throw e

      this.iter = oldIter
      return null
    }
  }

  one(...objs) {
    let oldIter = this.iter

    for(let i = 0; i < arguments.length; i++) {
      let obj = objs[i]
      try {
        if(obj instanceof Named)
          return handleNamed(this, obj)
        else
          return handle(this, obj)
      }
      catch(e) {
        if(!(e instanceof ParseError)) throw e

        this.iter = oldIter
        if(i+1 == arguments.length)
          throw e
      }
    }
  }
}

function handleString(p, str) {
  let s = p.source.substr(p.iter, str.length)
  if(s != str) {
    for(let i = 0; i < s.length; i++) {
      if(s[i] != str[i]) break
      p.iter++
    }
    throw p.error(`expected ${str}`)
  }

  p.iter += str.length
  return str
}

function handleRegExp(p, reg) {
  let str = p.source.substr(p.iter)
  let m = str.match(reg)
  if(m == null) 
    throw p.error(`expected ${reg}`)

  p.iter += m[0].length
  if(m[1] != null) return m[1]
  return m[0]
}

function handle(p, obj) {
  let pos = p.iter
  let res

  if(typeof obj == "string") {
    res = handleString(p, obj)
  }
  else if(obj instanceof RegExp) {
    res = handleRegExp(p, obj)
  }
  else if(typeof obj == "function") {
    res = obj(p)
    if(res == null) return
  }
  else {
    let r = obj.parse(p)
    if(r == null) return
    res = {
      $type: obj.$type,
      $value: r
    }
  }

  res.$pos = pos
  return res
}

function handleNamed(p, obj) {
  try {
    return handle(p, obj.obj)
  } catch(e) {
    if(!(e instanceof ParseError)) throw e

    throw p.error(`expected ${obj.name}`)
  }
}

class Named {
  constructor(name, obj) {
    this.name = name
    this.obj = obj
  }
}

module.exports = {
  Parser,
  Named
}