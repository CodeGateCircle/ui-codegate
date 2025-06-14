module.exports = (src, dest, preview) => () => {
  const vfs = require("vinyl-fs");
  const postcss = require("gulp-postcss");
  const autoprefixer = require("autoprefixer");
  const cssnano = require("cssnano");
  const postcssImport = require("postcss-import");
  const postcssVar = require("postcss-custom-properties");
  const postcssCalc = require("postcss-calc");
  const postcssUrl = require("postcss-url");
  const browserify = require("browserify");
  const concat = require("gulp-concat");
  const uglify = require("gulp-uglify");
  const { Transform } = require("stream");
  const map = transform => new Transform({ objectMode: true, transform });
  const through = () => map((file, enc, next) => next(null, file));
  const merge = require("merge-stream");
  const fs = require("fs-extra");
  const ospath = require("path");
  const path = ospath.posix;
  const imagemin = require("gulp-imagemin");
  const imageminMozjpeg = require("imagemin-mozjpeg");

  const opts = { base: src, cwd: src };
  const sourcemaps = preview || process.env.SOURCEMAPS === "true";

  const postcssPlugins = [
    postcssImport,
    (css, { messages, opts: { file } }) =>
      Promise.all(
        messages
          .reduce(
            (accum, { file: depPath, type }) =>
              type === "dependency" ? accum.concat(depPath) : accum,
            []
          )
          .map(importedPath => fs.stat(importedPath).then(({ mtime }) => mtime))
      ).then(mtimes => {
        const newestMtime = mtimes.reduce(
          (max, curr) => (!max || curr > max ? curr : max),
          file.stat.mtime
        );
        if (newestMtime > file.stat.mtime)
          file.stat.mtimeMs = +(file.stat.mtime = newestMtime);
      }),
    postcssUrl([
      {
        filter: asset =>
          new RegExp(
            "^[~][^/]*(?:font|typeface)[^/]*/.*/files/.+[.](?:ttf|woff2?)$"
          ).test(asset.url),
        url: asset => {
          const relpath = asset.pathname.slice(1);
          const abspath = require.resolve(relpath);
          const basename = ospath.basename(abspath);
          const destpath = ospath.join(dest, "font", basename);
          if (!fs.pathExistsSync(destpath)) fs.copySync(abspath, destpath);
          return path.join("..", "font", basename);
        }
      }
    ]),
    postcssVar({ preserve: preview }),
    preview ? postcssCalc : () => {},
    autoprefixer,
    preview ? () => {} : cssnano({ preset: "default" })
  ];

  function bundle({ base: basedir, ext: bundleExt = ".bundle.js" }) {
    return map((file, enc, next) => {
      if (bundleExt && file.relative.endsWith(bundleExt)) {
        const mtimePromises = [];
        const bundlePath = file.path;
        browserify(file.relative, { basedir, detectGlobals: false })
          .plugin("browser-pack-flat/plugin")
          .on("file", bundledPath => {
            if (bundledPath !== bundlePath)
              mtimePromises.push(fs.stat(bundledPath).then(({ mtime }) => mtime));
          })
          .bundle((bundleError, bundleBuffer) =>
            Promise.all(mtimePromises).then(mtimes => {
              const newestMtime = mtimes.reduce(
                (max, curr) => (curr > max ? curr : max),
                file.stat.mtime
              );
              if (newestMtime > file.stat.mtime)
                file.stat.mtimeMs = +(file.stat.mtime = newestMtime);
              if (bundleBuffer !== undefined) file.contents = bundleBuffer;
              next(
                bundleError,
                Object.assign(file, {
                  path: file.path.slice(0, file.path.length - 10) + ".js"
                })
              );
            })
          );
        return;
      }
      fs.readFile(file.path, "UTF-8").then(contents => {
        next(null, Object.assign(file, { contents: Buffer.from(contents) }));
      });
    });
  }

  function postcssPseudoElementFixer(css, result) {
    css.walkRules(/(?:^|[^:]):(?:before|after)/, rule => {
      rule.selector = rule.selectors
        .map(it => it.replace(/(^|[^:]):(before|after)$/, "$1::$2"))
        .join(",");
    });
  }

  return merge(
    // vfs.src("ui.yml", { ...opts, allowEmpty: true }),
    vfs
      .src("font/*.{ttf,woff*(2)}", { ...opts, allowEmpty: true })
      .pipe(through((file, env, next) => {
        console.log(file);
        next(null, file);
      })),
    vfs.src("helpers/*.js", { ...opts, allowEmpty: true })
      .pipe(through((file, env, next) => {
        console.log(file);
        next(null, file);
      })),
    vfs.src("layouts/*.hbs", { ...opts, allowEmpty: true })
      .pipe(through((file, env, next) => {
        console.log(file);
        next(null, file);
      })),
    vfs.src("partials/*.hbs", { ...opts, allowEmpty: true })
      .pipe(through((file, env, next) => {
        console.log(file);
        next(null, file);
      })),
    vfs
      .src("js/+([0-9])-*.js", { ...opts, read: false, sourcemaps })
      .pipe(bundle(opts))
      .pipe(uglify({ ie: true, module: false, output: { comments: /^! / } }))
      .pipe(concat("js/site.js")),
    vfs
      .src("js/vendor/+([^.])?(.bundle).js", { ...opts, read: false })
      .pipe(bundle(opts))
      .pipe(uglify({ ie: true, module: false, output: { comments: /^! / } })),
    vfs
      .src("js/vendor/*.min.js", opts)
      .pipe(
        map((file, enc, next) =>
          next(null, Object.assign(file, { extname: "" }, { extname: ".js" }))
        )
      ),
    vfs
      .src(["css/site.css", "css/vendor/*.css"], { ...opts, sourcemaps })
      .pipe(postcss(file => ({ plugins: postcssPlugins, options: { file } }))),
    vfs
      .src("img/**/*.{gif,ico,jpg,png,svg}", opts)
      .pipe(
        preview
          ? through()
          : imagemin(
              [
                imagemin.gifsicle(),
                imageminMozjpeg(),
                imagemin.optipng(),
                imagemin.svgo({
                  plugins: [
                    { cleanupIDs: { preservePrefixes: ["icon-", "view-"] } },
                    { removeViewBox: false },
                    { removeDesc: false }
                  ]
                })
              ].reduce((accum, it) => (it ? accum.concat(it) : accum), [])
            )
      ),
    vfs.src("static/**/*[!~]", {
      ...opts,
      base: ospath.join(src, "static"),
      dot: true
    })
      .pipe(through((file, env, next) => {
        console.log(file);
        next(null, file);
      })),
  ).pipe(vfs.dest(dest, { sourcemaps: sourcemaps && "." }));
};