module.exports = (src, dest, preview) => () => {
  const vfs = require("vinyl-fs");
  const postcss = require("gulp-postcss");
  const autoprefixer = require("autoprefixer");
  const cssnano = require("cssnano");
  const postcssImport = require("postcss-import");
  const postcssVar = require("postcss-custom-properties");
  const postcssCalc = require("postcss-calc");
  const browserify = require("browserify");
  const concat = require("gulp-concat");
  const uglify = require("gulp-uglify");
  const { Transform } = require("stream");
  const map = transform => new Transform({ objectMode: true, transform });
  const merge = require("merge-stream");
  const fs = require("fs-extra");

  const postcssPlugins = [
    postcssImport,
    postcssVar({ preserve: preview }),
    preview ? postcssCalc : () => {},
    autoprefixer,
    preview ? () => {} : cssnano({ preset: "default" })
  ];

  function bundle({ base: basedir, ext: bundleExt = ".bundle.js" }) {
    return map((file, enc, next) => {
      if (bundleExt && file.relative.endsWith(bundleExt)) {
        const bundlePath = file.path;
        browserify(file.relative, { basedir, detectGlobals: false })
          .plugin("browser-pack-flat/plugin")
          .bundle((bundleError, bundleBuffer) => {
            if (bundleBuffer !== undefined) file.contents = bundleBuffer;
            next(
              bundleError,
              Object.assign(file, {
                path: file.path.slice(0, file.path.length - 10) + ".js"
              })
            );
          });
        return;
      }
      fs.readFile(file.path, "UTF-8").then(contents => {
        next(null, Object.assign(file, { contents: Buffer.from(contents) }));
      });
    });
  }

  return merge(
    vfs
      .src(["css/site.css", "css/vendor/*.css"], { base: src, cwd: src })
      .pipe(postcss(file => ({ plugins: postcssPlugins, options: { file } }))),
    vfs
      .src("js/+([0-9])-*.js", { base: src, cwd: src })
      .pipe(bundle({ base: src }))
      .pipe(uglify({ ie: true, module: false, output: { comments: /^! / } }))
      .pipe(concat("js/site.js")),
    vfs
      .src("js/vendor/+([^.])?(.bundle).js", { base: src, cwd: src })
      .pipe(bundle({ base: src }))
      .pipe(uglify({ ie: true, module: false, output: { comments: /^! / } })),
    vfs
      .src("js/vendor/*.min.js", { base: src, cwd: src })
      .pipe(
        map((file, enc, next) =>
          next(null, Object.assign(file, { extname: "" }, { extname: ".js" }))
        )
      )
  ).pipe(vfs.dest(dest));
};