/**
 * @param {RegExp} regex 
 * @param {Boolean} [omit]
 */
function rule(regex, omit) {
  return {name: null, regex: regex, omit: omit}
}

module.exports = {
  IMPORT:   rule(/import/),
  NEWLINE:  rule(/(?:\r?\n)+/),
  WHITESPACE: rule(/[ \t]+/, true),
  IDENTIFIER: rule(/([a-z]+)/)
}