/** Reads a picked file as UTF-8 text. FileReader rather than Blob.text(), which jsdom lacks. */
export function readText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('file could not be read'));
    reader.readAsText(file);
  });
}
