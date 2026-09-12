import { execFileSync } from 'node:child_process'

// Git consumers execute committed output. Typecheck alone cannot catch a source
// export that was never rebuilt, and diff alone misses newly generated files.
const changes = execFileSync('git', ['status', '--porcelain', '--untracked-files=all', '--', 'dist'], { encoding: 'utf8' }).trim()
if (changes) throw new Error(`Rebuild and commit the SDK output:\n${changes}`)
