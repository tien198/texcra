export function StatusBar() {
  return (
    <div
      className={
        'flex flex-wrap items-center gap-[32px] text-[13px] text-muted-foreground max-[1399px]:gap-[16px]'
      }
    >
      <span>
        Status: <strong className="font-medium text-foreground">Changed</strong>{' '}
        &mdash;{' '}
        <button
          type="button"
          className="font-medium text-foreground underline underline-offset-2 hover:opacity-80 transition-opacity"
        >
          Revert to published
        </button>
      </span>
      <span>
        Last Modified:{' '}
        <strong className="font-medium text-foreground">
          September 15th 2026, 2:35 PM
        </strong>
      </span>
      <span>
        Created:{' '}
        <strong className="font-medium text-foreground">
          September 14th 2026, 11:00 PM
        </strong>
      </span>
    </div>
  )
}
