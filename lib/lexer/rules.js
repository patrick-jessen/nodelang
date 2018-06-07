// @ts-check

/**
 * @param {RegExp} regex 
 * @param {Boolean} [omit]
 */
function rule(regex, omit) {
  return {name: null, regex: regex, omit: omit}
}

// @ts-ignore
module.exports = {
  VAR:          rule(/var/),
  FUNC:         rule(/func/),
  IMPORT:       rule(/import/),
  RETURN:       rule(/return/),

  WHITESPACE:   rule(/[ \t]+/, true),
  NEWLINE:      rule(/[\r\n\t ]+/),
  
  IDENTIFIER:   rule(/([a-z]+)/),

  EQUALS:       rule(/=/),
  ADD:          rule(/\+/),
  SUB:          rule(/-/),
  MUL:          rule(/\*/),
  DIV:          rule(/\//),

  PARENT_START: rule(/\(/),
  PARENT_END:   rule(/\)/),
  CURL_START:   rule(/\{/),
  CURL_END:     rule(/\}/),
  
  COMMA:        rule(/,/),
  DOT:          rule(/\./),

  STRING:       rule(/"([^"]*)"/),
  FLOAT:        rule(/((?:0|([1-9][0-9]*))\.[0-9]+)/),
  INTEGER:      rule(/(0|[1-9][0-9]*)/)
}