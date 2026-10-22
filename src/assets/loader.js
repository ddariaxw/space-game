export async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status} for ${url}`);
  }
  return await response.json();
}

export async function withRetry(fn, { attempts = 3, baseMs = 300, signal } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      return await fn();
    } catch (error) {
      if (error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429) {
        throw error;
      }
      if (attempt === attempts || signal?.aborted) {
        throw error;
      }
      const delay = baseMs * Math.pow(2, attempt - 1) + Math.random() * 100;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, delay);
        signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      });
    }
  }
}

export function loadImage(src, signal) {
  return withRetry(async () => {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
      
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      
      signal?.addEventListener('abort', () => {
        img.src = '';
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });

      img.src = src;
    });
  }, { signal });
}

export async function loadAll(manifestUrl, { onProgress, signal } = {}) {
  const manifest = await fetchJson(manifestUrl, { signal });
  
  const imageEntries = Object.entries(manifest.images || {});
  const totalItems = imageEntries.length;
  let loadedCount = 0;

  const updateProgress = (promise) => {
    return promise.then((res) => {
      loadedCount++;
      if (typeof onProgress === 'function') {
        onProgress(loadedCount / totalItems);
      }
      return res;
    });
  };

  const imagePromises = imageEntries.map(([key, src]) => 
    updateProgress(loadImage(src, signal)).then(img => [key, img])
  );

  const images = await Promise.all(imagePromises).then(Object.fromEntries);

  return {
    images,
    arena: manifest.arena
  };
}