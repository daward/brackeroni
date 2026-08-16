export function InlineTitleField({
  autoFocus = false,
  value,
  placeholder = "",
  onChange,
  onBlur,
  onKeyDown,
  heading = false
}) {
  return (
    <input
      autoFocus={autoFocus}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className={heading
        ? "block w-full border-0 bg-transparent px-0 py-2 text-[var(--ink)] outline-none focus:text-[var(--accent-3)]"
        : "-mx-3 block w-[calc(100%+1.5rem)] border border-[var(--line)] bg-transparent px-3 py-2 text-[var(--ink)] outline-none focus:border-[var(--accent-3)]"}
      style={{
        fontFamily: '"Arial Narrow", Arial, Helvetica, sans-serif',
        fontSize: heading ? "30px" : "24px",
        fontWeight: 900,
        lineHeight: 1
      }}
    />
  );
}
