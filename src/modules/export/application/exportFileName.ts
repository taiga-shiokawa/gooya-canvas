import { DEFAULT_PROJECT_NAME } from '@/modules/workflow'

// Export 成果物のファイル名生成（docs/functional-design.md §8）。
// project-name はユーザーが自由に入力できるため、OS のファイル名に使えない文字を
// 落としてから拡張子を付ける。純関数なのでブラウザ API に触れない。
//
// 同じサニタイズ規則が project モジュール（application/projectFileName.ts）にもあるが、
// feature モジュール間の import は禁止されている（repository-structure §5.1 #4）ため
// 共有していない。共通化するなら shared へ移す必要があり、それは配置規則の変更を伴う。

/** PNG Export の拡張子（FR-016）。 */
export const PNG_FILE_EXTENSION = '.png'

/** PDF Export の拡張子（FR-017）。 */
export const PDF_FILE_EXTENSION = '.pdf'

/** Windows / macOS / Linux で共通して避ける文字（`\p{Cc}` は制御文字）。 */
const UNSAFE_CHARACTERS = /[\p{Cc}<>:"/\\|?*]/gu

/** Windows の予約デバイス名。拡張子を付けてもファイル名として使えない。 */
const RESERVED_DEVICE_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

/** `.` / `..` だけの断片。パス解釈のもとになるので残さない。 */
const DOTS_ONLY = /^\.+$/

/** 長すぎるファイル名はファイルシステムの上限に触れるため切り詰める。 */
const MAX_BASE_LENGTH = 100

/** `{project-name}.png` / `{project-name}.pdf` を組み立てる。 */
export function toExportFileName(
  projectName: string,
  extension: string,
): string {
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

  return `${base}${extension}`
}
