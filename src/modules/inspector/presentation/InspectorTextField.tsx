import { useId } from 'react'

// Inspector のラベル付き入力の唯一のプリミティブ。共通項目・種別別フォーム・Edge の
// すべてがこれを使い、フォームごとにマークアップとクラスを重複させない。

type InspectorTextFieldProps = {
  label: string
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  /** datalist の候補。自由入力は妨げない。 */
  suggestions?: readonly string[]
  multiline?: boolean
  numeric?: boolean
  /** Node Type のような読み取り専用項目（docs/functional-design.md §6）。 */
  readOnly?: boolean
  hint?: string
}

const CONTROL_CLASS =
  'w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none read-only:border-slate-200 read-only:bg-slate-100 read-only:text-slate-500'

export function InspectorTextField({
  label,
  value,
  onChange,
  placeholder,
  suggestions,
  multiline = false,
  numeric = false,
  readOnly = false,
  hint,
}: InspectorTextFieldProps) {
  const listId = useId()

  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {multiline ? (
        <textarea
          rows={2}
          value={value}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={(event) => onChange?.(event.target.value)}
          className={`${CONTROL_CLASS} resize-y`}
        />
      ) : (
        <input
          type={numeric ? 'number' : 'text'}
          min={numeric ? 0 : undefined}
          value={value}
          readOnly={readOnly}
          placeholder={placeholder}
          list={suggestions ? listId : undefined}
          onChange={(event) => onChange?.(event.target.value)}
          className={CONTROL_CLASS}
        />
      )}
      {suggestions ? (
        <datalist id={listId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      ) : null}
      {hint ? <span className="text-[11px] text-slate-500">{hint}</span> : null}
    </label>
  )
}
