/** Hands the browser a text file to save, under the given name. */
export function downloadText(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  // Revoked on the next task: some browsers start the download asynchronously.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
