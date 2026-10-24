/** خروجی CSV سمت مرورگر با BOM تا اکسل فارسی درست نمایش دهد. */
export function buildCsv(
  headers: string[],
  rows: ReadonlyArray<ReadonlyArray<string | number>>,
): string {
  const escapeCell = (value: string | number): string => {
    const text = String(value ?? "");
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: ReadonlyArray<ReadonlyArray<string | number>>,
): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([buildCsv(headers, rows)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
