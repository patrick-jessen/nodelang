// @ts-check

class Named {
  constructor(name, obj) {
    this.name = name
    this.obj = obj
  }
}

/**
 * @typedef {{parse:((p:Parser) => *), generate?:*, $type?:String}} ParserObj
 * @typedef {String|RegExp|Named|((p:Parser) => *)|ParserObj} Obj
 * @typedef {{$pos:Number, $type:String, $value:*}} ASTNode
 */

 // @ts-ignore
let Source = require("./source").Source
// @ts-ignore
let ParseError = require("./source").Error

class Parser {
  /**
   * @param {*} ruleMap 
   * @param {Source} srcObj 
   */
  constructor(ruleMap, srcObj) {
    this.ruleMap = ruleMap
    this.srcObj = srcObj
    this.source = srcObj.join()

    this.iter = 0
    this.err = null
  }


  parse() {
    if(this.ruleMap["root"] == null) 
      throw `no root rule is defined`

    let ast = this.one(this.ruleMap["root"])
    this.done()
    return ast 
  }

  done() {
    if(this.iter < this.source.length) {
      throw this.err.toString()
    }
  }

  print() {
    let pos = this.srcObj.positionInfo(this.iter)
    let pre = `${pos.lineNo} |  `
    let arrow = " ".repeat(pre.length + pos.columnNo) + "^"
    console.log(`${pre}${pos.line}\n${arrow}`)
  }

  /**
   * @param {String} message 
   * @param {Number} [pos]
   * @return {ParseError}
   */
  error(message, pos) {
    if(pos == null) pos = this.iter

    let e = new ParseError(this.srcObj, pos, message)
    if(this.err == null || this.err.pos <= e.pos) {
      this.err = e
    }
    return e
  }

  /**
   * @param {Obj[]} objs
   * @return {ASTNode[]}
   */
  any(...objs) {
    let ret = []

    while(true) {
      let oldIter = this.iter
      try {
        let res = this.one(...objs)
        if(res != null)
          ret.push(res)
      } catch(e) {
        if(!(e instanceof ParseError)) throw e

        this.iter = oldIter
        return ret
      }
    }
  }

  /**
   * @param {Obj[]} objs
   * @return {ASTNode[]}
   */
  many(...objs) {
    let ret = []

    while(true) {
      let oldIter = this.iter
      try {
        let res = this.one(...objs)
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

  /**
   * @param {Obj[]} objs
   * @return {ASTNode}
   */
  opt(...objs) {
    let oldIter = this.iter
    try {
      return this.one(...objs)
    } catch(e) {
      if(!(e instanceof ParseError)) throw e

      this.iter = oldIter
      return null
    }
  }

  /**
   * @param {Obj[]} objs
   * @return {ASTNode}
   */
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

/**
 * @param {Parser} p
 * @param {String} str
 * @return {String}
 */
function handleString(p, str) {
  let s = p.source.substr(p.iter, str.length)
  if(s != str) {
    // for(let i = 0; i < s.length; i++) {
    //   if(s[i] != str[i]) break
    //   p.iter++
    // }
    throw p.error(`expected ${str}`)
  }

  p.iter += str.length
  return str
}

/**
 * @param {Parser} p
 * @param {RegExp} reg
 * @return {String}
 */
function handleRegExp(p, reg) {
  let str = p.source.substr(p.iter)
  let m = str.match(reg)
  if(m == null) 
    throw p.error(`expected ${reg}`)

  p.iter += m.index + m[0].length
  if(m[1] != null) return m[1]
  return m[0]
}

/**
 * @param {Parser} p
 * @param {Obj} obj
 * @return {ASTNode}
 */
function handle(p, obj) {
  let pos = p.iter
  let type
  let res

  if(typeof obj == "string") {
    res = handleString(p, obj)
    type = "string"
  }
  else if(obj instanceof RegExp) {
    res = handleRegExp(p, obj)
    type = "string"
  }
  else if(typeof obj == "function") {
    res = obj(p)
    if(res == null) return
    if(res.$type != null) return res
    type = "???"
  }
  else if(!(obj instanceof Named)) {
    res = obj.parse(p)
    if(res == null) return
    type = obj.$type
  }

  return {
    $pos: pos,
    $type: type,
    $value: res
  }
}

/**
 * @param {Parser} p
 * @param {Named} obj
 * @return {ASTNode}
 */
function handleNamed(p, obj) {
  try {
    return handle(p, obj.obj)
  } catch(e) {
    if(!(e instanceof ParseError)) throw e

    throw p.error(`expected ${obj.name}`)
  }
}

// @ts-ignore
module.exports = {
  Parser,
  Named
}