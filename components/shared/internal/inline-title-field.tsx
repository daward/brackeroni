export function InlineTitleField({
  autoFocus = false,
  value,
  placeholder = "",
  onChange,
  onBlur,
  onKeyDown = () => {},
  heading = false
}: InlineTitleFieldProps) {
  return (
    <input
      autoFocus={autoFocus}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className={heading ? "inline-title-field inline-title-field-heading" : "inline-title-field"}
    />
  );
}
import type { InlineTitleFieldProps } from "../types";
