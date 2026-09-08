function inlineComputedStyles(source: HTMLElement, clone: HTMLElement): void {
  const sourceElements = [source, ...Array.from(source.querySelectorAll<HTMLElement>('*'))];
  const cloneElements = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))];

  sourceElements.forEach((element, index) => {
    const target = cloneElements[index];
    if (!target) return;
    const styles = window.getComputedStyle(element);
    for (let propertyIndex = 0; propertyIndex < styles.length; propertyIndex += 1) {
      const property = styles.item(propertyIndex);
      target.style.setProperty(property, styles.getPropertyValue(property), styles.getPropertyPriority(property));
    }
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Preview image could not be loaded'));
    image.src = source;
  });
}

export async function downloadElementAsPng(element: HTMLElement, filename: string): Promise<void> {
  const width = Math.ceil(element.getBoundingClientRect().width);
  const height = Math.ceil(element.getBoundingClientRect().height);
  if (width <= 0 || height <= 0) throw new Error('Preview has no drawable size');

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.margin = '0';
  clone.style.transform = 'none';
  inlineComputedStyles(element, clone);

  const serialized = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden">${serialized}</div></foreignObject></svg>`;
  const imageUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));

  try {
    const image = await loadImage(imageUrl);
    const scale = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    const canvas = window.document.createElement('canvas');
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas context is unavailable');
    context.scale(scale, scale);
    context.drawImage(image, 0, 0, width, height);

    const anchor = window.document.createElement('a');
    anchor.href = canvas.toDataURL('image/png');
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
