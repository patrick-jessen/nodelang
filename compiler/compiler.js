
function compile(ast, backend) {
  return backend(ast)
}

module.exports = {
  compile,
}