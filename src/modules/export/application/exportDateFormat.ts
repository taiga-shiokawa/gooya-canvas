// PDF へ付記する Generated Date の整形（docs/functional-design.md §8.2 / FR-017）。
//
// 現在時刻は引数で受け取り純関数に保つ（development-guidelines §2.2）。
// ロケール依存の書式（toLocaleString）は環境で揺れるため使わず、
// ローカル時刻を ISO 風の固定書式で組み立てる。

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

/** `Generated: 2026-09-08 14:05` の後半部分。無効な Date には空文字を返す。 */
export function formatGeneratedDate(date: Date): string {
  const time = date.getTime()
  if (!Number.isFinite(time)) return ''

  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())

  return `${year}-${month}-${day} ${hours}:${minutes}`
}
