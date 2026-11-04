export type Option<TValue = string> = {
  value: TValue
  label: string
  slug?: string
  data?: Record<string, unknown>
}
