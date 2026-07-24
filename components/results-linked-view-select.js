"use client";

import { useRouter } from "next/navigation";

export function ResultsLinkedViewSelect({
  value,
  options
}) {
  const router = useRouter();

  return (
    <div className="results-scoring-header-control">
      <select
        value={value}
        onChange={(event) => {
          const nextOption = options.find((option) => option.value === event.target.value);

          if (nextOption?.href) {
            router.push(nextOption.href);
          }
        }}
        className="ui-field ui-field-select results-scoring-header-select"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
