// @ts-check

/**
 * @typedef {{name:String, regex:RegExp, omit?:Boolean}} Rule
 */

/** @type {{[x:string]:Rule}} */
// @ts-ignore
let rulesMap = require("./rules")

class Token {
  /**
   * @param {Number} pos 
   * @param {String} name 
   * @param {String} [value]
   */
  constructor(pos, name, value) {
    this.position = pos
    this.$type = name
    if(value != null)
      this.value = value
  }

  toJSON() {
    return `${this.value} (${this.$type})`
  }
}

/**
 * @param {String} srcString 
 * @param {(msg:String,pos:Number)=>*} errHandler 
 * @returns {Token[]}
 */
function run(srcString, errHandler) {
  let ruleNames = Object.keys(rulesMap)
  let ruleArr = []
  for(let name of ruleNames) {
    let rule = rulesMap[name]
    rule.name = name
    rule.regex = new RegExp(`^${rule.regex.source}`)
    ruleArr.push(rule) // Assuming that keys are ordered
  }
  
  let tokens = []
  let m = null
  let iter = 0

  while(iter < srcString.length) {
    let subString = srcString.substr(iter)
    for(let rule of ruleArr) {
      m = subString.match(rule.regex)
      if(m == null) continue

      if(!rule.omit)
        tokens.push(new Token(iter, rule.name, m[1]))

      iter += m[0].length
      break
    }

    if(m == null)
      throw errHandler(`unexpected token`, iter)
  }

  if(tokens.length > 0 && tokens[tokens.length-1].name != "NEWLINE")
    tokens.push(new Token(iter++, "NEWLINE"))
  tokens.push(new Token(iter, "EOS"))

  return tokens
}

// @ts-ignore
module.exports = {
  Token,
  run
}