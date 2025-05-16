'use strict'

import eslint from 'gulp-eslint'
import vfs from 'vinyl-fs'

export default (files) => (done) =>
  vfs
    .src(files)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
    .on('error', done)
