'use strict'

import prettier from "../lib/gulp-prettier-eslint"
import vfs from "vinyl-fs"

export default (files) => () =>
  vfs
    .src(files)
    .pipe(prettier())
    .pipe(vfs.dest((file) => file.base))
