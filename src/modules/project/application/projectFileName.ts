import { DEFAULT_PROJECT_NAME } from '@/modules/workflow'

// 保存ファイル名の生成（docs/functional-design.md §7.2）。
// project-name はユーザーが自由に入力できるため、OS のファイル名に使えない文字を
// 落としてから拡張子を付ける。純関数なのでブラウザ API に触れない。

/** 外部契約であるプロジェクトファイルの拡張子（docs/functional-design.md §12）。 */
export const PROJECT_FILE_EXTENSION = '.gooya-canvas.json'

/** Windows / macOS / Linux で共通して避ける文字（`\p{Cc}` は制御文字）。 */
const UNSAFE_CHARACTERS = /[\p{Cc}<>:"/\\|?*]/gu

/** Windows の予約デバイス名。拡張子を付けてもファイル名として使えない。 */
const RESERVED_DEVICE_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

/** `.` / `..` だけの断片。パス解釈のもとになるので残さない。 */
const DOTS_ONLY = /^\.+$/

/** 長すぎるファイル名はファイルシステムの上限に触れるため切り詰める。 */
const MAX_BASE_LENGTH = 100

/** `{project-name}.gooya-canvas.json` を組み立てる。 */
export function toProjectFileName(projectName: string): string {
  const sanitized = projectName
    .replace(UNSAFE_CHARACTERS, ' ')
    .split(/\s+/)
    .filter((segment) => segment.length > 0 && !DOTS_ONLY.test(segment))
    .join(' ')
    .slice(0, MAX_BASE_LENGTH)
    // 先頭のドットは隠しファイル化を、末尾のドット・空白は Windows での
    // 切り詰めを招くため落とす
    .replace(/^\.+/, '')
    .replace(/[.\s]+$/, '')
    .trim()

  const base =
    sanitized.length > 0 && !RESERVED_DEVICE_NAMES.test(sanitized)
      ? sanitized
      : DEFAULT_PROJECT_NAME

  return `${base}${PROJECT_FILE_EXTENSION}`
}
