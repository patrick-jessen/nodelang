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
  WHITESPACE:   rule(/[ \t]+/, true),
  NEWLINE:      rule(/[\r\n\t ]+/),
  IDENTIFIER:   rule(/([a-z]+)/),
  EQUALS:       rule(/=/),
  ADD:          rule(/\+/),
  STRING:       rule(/"([^"]*)"/),
  PARENT_START: rule(/\(/),
  PARENT_END:   rule(/\)/),
  CURL_START:   rule(/\{/),
  CURL_END:     rule(/\}/),
}