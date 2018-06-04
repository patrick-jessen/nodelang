/**
 * @param {RegExp} regex 
 * @param {Boolean} [omit]
 */
function rule(regex, omit) {
  return {name: null, regex: regex, omit: omit}
}

module.exports = {
  VAR:          rule(/var/),
  FUNC:         rule(/func/),
  IMPORT:       rule(/import/),

  WHITESPACE:   rule(/[ \t]+/, true),
  NEWLINE:      rule(/[\r\n\t ]+/),
  IDENTIFIER:   rule(/([a-z]+)/),

  EQUALS:       rule(/=/),
  ADD:          rule(/\+/),
  SUB:          rule(/-/),
  MUL:          rule(/\*/),
  DIV:          rule(/\//),

  STRING:       rule(/"([^"]*)"/),
  PARENT_START: rule(/\(/),
  PARENT_END:   rule(/\)/),
  CURL_START:   rule(/\{/),
  CURL_END:     rule(/\}/),
  COMMA:        rule(/,/),
  FLOAT:        rule(/((?:0|([1-9][0-9]*))\.[0-9]+)/),
  INTEGER:      rule(/(0|[1-9][0-9]*)/)
}