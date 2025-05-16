'use strict'

const camelCase = (name) => name.replace(/[-]./g, (m) => m.slice(1).toUpperCase())

// module.exports = require('require-directory')(module, __dirname, { recurse: false, rename: camelCase })
import re_direc from 'require-directory'

export default re_direc(module, __dirname, {
  recurse: false,
  rename: camelCase,
})
