'use strict'

import ospath from 'path'
import vfs from 'vinyl-fs'

// 動的インポートに変換
const getZip = async () => {
  try {
    return await import('@vscode/gulp-vinyl-zip')
  } catch {
    return await import('gulp-vinyl-zip')
  }
}

export default (src, dest, bundleName, onFinish) => async () => {
  const { default: zip } = await getZip()

  return vfs
    .src('**/*', { base: src, cwd: src, dot: true })
    .pipe(zip.dest(ospath.join(dest, `${bundleName}-bundle.zip`)))
    .on('finish', () => onFinish && onFinish(ospath.resolve(dest, `${bundleName}-bundle.zip`)))
}
