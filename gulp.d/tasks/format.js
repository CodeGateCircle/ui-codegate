'use strict'

import prettierPlugin from '../lib/gulp-prettier-eslint.js'
import vfs from 'vinyl-fs'

export default (files) => () =>
  vfs
    .src(files)
    .pipe(prettierPlugin())
    .pipe(vfs.dest((file) => file.base))
