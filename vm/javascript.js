let lib = `
main()
function print(...args) {
  console.log(...args);
}
`

function vm(code) {
  eval(lib + code)
}

module.exports = {
  vm
}