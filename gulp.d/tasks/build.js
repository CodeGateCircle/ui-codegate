'use strict'

import autoprefixer from 'autoprefixer'
import browserify from 'browserify'
import concat from 'gulp-concat'
import cssnano from 'cssnano'
import fs from 'fs-extra'
import imagemin from 'gulp-imagemin'
import merge from 'merge-stream'
import ospath from 'path'
import postcss from 'gulp-postcss'
import postcssCalc from 'postcss-calc'
import postcssImport from 'postcss-import'
import postcssUrl from 'postcss-url'
import postcssVar from 'postcss-custom-properties'
import { Transform } from 'stream'
import uglify from 'gulp-uglify'
import vfs from 'vinyl-fs'

const path = ospath.posix
const map = (transform) => new Transform({ objectMode: true, transform })
const through = () => map((file, enc, next) => next(null, file))

export default (src, dest, preview) => () => {
  const opts = { base: src, cwd: src }
  const sourcemaps = preview || process.env.SOURCEMAPS === 'true'
  const postcssPlugins = [
    postcssImport,
    (css, { messages, opts: { file } }) =>
      Promise.all(
        messages
          .reduce((accum, { file: depPath, type }) => (type === 'dependency' ? accum.concat(depPath) : accum), [])
          .map((importedPath) => fs.stat(importedPath).then(({ mtime }) => mtime))
      ).then((mtimes) => {
        const newestMtime = mtimes.reduce((max, curr) => (!max || curr > max ? curr : max), file.stat.mtime)
        if (newestMtime > file.stat.mtime) file.stat.mtimeMs = +(file.stat.mtime = newestMtime)
      }),
    postcssUrl([
      {
        filter: (asset) => new RegExp('^[~][^/]*(?:font|typeface)[^/]*/.*/files/.+[.](?:ttf|woff2?)$').test(asset.url),
        url: async (asset) => {
          const relpath = asset.pathname.slice(1)
          const { fileURLToPath } = await import('url')
          const abspath = fileURLToPath(new URL(relpath, import.meta.url))
          const basename = ospath.basename(abspath)
          const destpath = ospath.join(dest, 'font', basename)
          if (!fs.pathExistsSync(destpath)) fs.copySync(abspath, destpath)
          return path.join('..', 'font', basename)
        },
      },
    ]),
    postcssVar({ preserve: preview }),
    // NOTE to make vars.css available to all top-level stylesheets, use the next line in place of the previous one
    //postcssVar({ importFrom: path.join(src, 'css', 'vars.css'), preserve: preview }),
    preview ? postcssCalc : () => {}, // cssnano already applies postcssCalc
    autoprefixer,
    preview
      ? () => {}
      : (css, result) => cssnano({ preset: 'default' })(css, result).then(() => postcssPseudoElementFixer(css, result)),
  ]

  return merge(
    vfs.src('ui.yml', { ...opts, allowEmpty: true }),
    vfs
      .src('js/+([0-9])-*.js', { ...opts, read: false, sourcemaps })
      .pipe(bundle(opts))
      .pipe(uglify({ ie: true, module: false, output: { comments: /^! / } }))
      // NOTE concat already uses stat from newest combined file
      .pipe(concat('js/site.js')),
    vfs
      .src('js/vendor/+([^.])?(.bundle).js', { ...opts, read: false })
      .pipe(bundle(opts))
      .pipe(uglify({ ie: true, module: false, output: { comments: /^! / } })),
    vfs
      .src('js/vendor/*.min.js', opts)
      .pipe(map((file, enc, next) => next(null, Object.assign(file, { extname: '' }, { extname: '.js' })))),
    // NOTE use the next line to bundle a JavaScript library that cannot be browserified, like jQuery
    //vfs.src(require.resolve('<package-name-or-require-path>'), opts).pipe(concat('js/vendor/<library-name>.js')),
    vfs
      .src(['css/site.css', 'css/vendor/*.css'], { ...opts, sourcemaps })
      .pipe(postcss((file) => ({ plugins: postcssPlugins, options: { file } }))),
    vfs.src('font/*.{ttf,woff*(2)}', opts),
    vfs.src('img/**/*.{gif,ico,jpg,png,svg}', opts).pipe(
      preview
        ? through()
        : imagemin(
          [
            imagemin.gifsicle(),
            imagemin.jpegtran(),
            imagemin.optipng(),
            imagemin.svgo({
              plugins: [
                { cleanupIDs: { preservePrefixes: ['icon-', 'view-'] } },
                { removeViewBox: false },
                { removeDesc: false },
              ],
            }),
          ].reduce((accum, it) => (it ? accum.concat(it) : accum), [])
        )
    ),
    vfs.src('helpers/*.js', opts),
    vfs.src('layouts/*.hbs', opts),
    vfs.src('partials/*.hbs', opts),
    vfs.src('static/**/*[!~]', { ...opts, base: ospath.join(src, 'static'), dot: true })
  ).pipe(vfs.dest(dest, { sourcemaps: sourcemaps && '.' }))
}

function bundle ({ base: basedir, ext: bundleExt = '.bundle.js' }) {
  return map((file, enc, next) => {
    if (bundleExt && file.relative.endsWith(bundleExt)) {
      const mtimePromises = []
      const bundlePath = file.path
      browserify(file.relative, { basedir, detectGlobals: false })
        .plugin('browser-pack-flat/plugin')
        .on('file', (bundledPath) => {
          if (bundledPath !== bundlePath) mtimePromises.push(fs.stat(bundledPath).then(({ mtime }) => mtime))
        })
        .bundle((bundleError, bundleBuffer) =>
          Promise.all(mtimePromises).then((mtimes) => {
            const newestMtime = mtimes.reduce((max, curr) => (curr > max ? curr : max), file.stat.mtime)
            if (newestMtime > file.stat.mtime) file.stat.mtimeMs = +(file.stat.mtime = newestMtime)
            if (bundleBuffer !== undefined) file.contents = bundleBuffer
            next(bundleError, Object.assign(file, { path: file.path.slice(0, file.path.length - 10) + '.js' }))
          })
        )
      return
    }
    fs.readFile(file.path, 'UTF-8').then((contents) => {
      next(null, Object.assign(file, { contents: Buffer.from(contents) }))
    })
  })
}

function postcssPseudoElementFixer (css, result) {
  css.walkRules(/(?:^|[^:]):(?:before|after)/, (rule) => {
    rule.selector = rule.selectors.map((it) => it.replace(/(^|[^:]):(before|after)$/, '$1::$2')).join(',')
  })
}
