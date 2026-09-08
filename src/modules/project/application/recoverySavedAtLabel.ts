// 復旧ダイアログへ出す「いつの未保存データか」の整形（docs/functional-design.md §7.5）。
//
// savedAt は localStorage 由来＝ユーザーが書き換えられる外部入力であり、
// Zod は「文字列であること」までしか保証しない。日時として読めない値が来ても
// `NaN-NaN-NaN` のような表示にならないよう、ここで null へ倒す。
//
// ロケール依存の書式（toLocaleString）は環境で揺れるため使わず、
// ローカル時刻を固定書式で組み立てる（export/application/exportDateFormat.ts と同方針）。

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

/**
 * ISO 8601 の文字列を `2026-09-08 14:05` 形式へ整形する。
 * 日時として解釈できない文字列には `null` を返す（呼び出し側は日時を出さない）。
 */
export function formatRecoverySavedAt(savedAt: string): string | null {
  const date = new Date(savedAt)
  const time = date.getTime()
  if (!Number.isFinite(time)) return null

  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())

  return `${year}-${month}-${day} ${hours}:${minutes}`
}
