const j = require('jscodeshift')

function transform (file, api, options) {
  console.log('transforming', file.path)

  const parsed = j(file.source)
  const transformed = parsed.find(j.ImportDeclaration)

  const outputOptions = {
    quote: 'single'
  }
  return transformed.toSource(outputOptions)
}

module.exports = transform
