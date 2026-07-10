(() => {
  const BAD_SOURCE = /(?:screenshot=true|embed=screenshot\.url|image\.thum\.io)/i;
  const PRODUCT_SELECTORS = '.product-img, #quick-image, #set-image, .fav-row img';
  const RETRY_LIMIT = 2;

  const productImageUrl = (pageUrl, retry = 0) => {
    const params = new URLSearchParams({
      url: pageUrl,
      embed: 'image.url'
    });
    if (retry > 0) params.set('force', 'true');
    if (retry > 1) params.set('_retry', String(Date.now()));
    return `https://api.microlink.io/?${params.toString()}`;
  };

  const cardProductUrl = image => {
    const card = image.closest('.card');
    return card?.querySelector('.card-link')?.href
      || card?.querySelector('h3 a')?.href
      || card?.querySelector('.card-action')?.href
      || '';
  };

  const favoriteProductUrl = image => {
    const row = image.closest('.fav-row');
    const name = row?.querySelector('h3')?.textContent?.trim();
    if (!name) return '';
    const card = [...document.querySelectorAll('.card')]
      .find(item => item.querySelector('h3')?.textContent?.trim() === name);
    return cardProductUrl(card?.querySelector('.product-img'));
  };

  const resolveProductUrl = image => {
    if (image.id === 'quick-image') return document.querySelector('#quick-link')?.href || image.dataset.productPage || '';
    if (image.id === 'set-image') return document.querySelector('#set-pants-link')?.href || image.dataset.productPage || '';
    if (image.closest('.fav-row')) return favoriteProductUrl(image) || image.dataset.productPage || '';
    return cardProductUrl(image) || image.dataset.productPage || '';
  };

  const markLoaded = image => {
    image.hidden = false;
    image.classList.add('loaded');
    image.classList.remove('screenshot');
    const media = image.closest('.media, .quick-media, .set-media, .fav-row');
    media?.classList.add('has-image');
    media?.classList.remove('error');
  };

  const markUnavailable = image => {
    image.classList.remove('loaded', 'screenshot');
    image.hidden = true;
    const media = image.closest('.media, .quick-media, .set-media, .fav-row');
    media?.classList.remove('has-image');
    media?.classList.add('error');
  };

  const loadProductOnlyImage = (image, pageUrl, retry = 0) => {
    if (!image || !pageUrl || pageUrl === '#') return;
    image.dataset.productPage = pageUrl;
    image.dataset.productRetry = String(retry);
    image.hidden = false;
    image.classList.remove('screenshot');
    image.onload = () => markLoaded(image);
    image.onerror = () => {
      const nextRetry = Number(image.dataset.productRetry || 0) + 1;
      if (nextRetry <= RETRY_LIMIT) {
        loadProductOnlyImage(image, image.dataset.productPage, nextRetry);
      } else {
        markUnavailable(image);
      }
    };
    image.src = productImageUrl(pageUrl, retry);
  };

  const enforceProductOnlyImage = image => {
    if (!(image instanceof HTMLImageElement) || !image.matches(PRODUCT_SELECTORS)) return;
    const pageUrl = resolveProductUrl(image);
    if (!pageUrl) return;

    const source = image.currentSrc || image.src || '';
    const pageChanged = image.dataset.productPage && image.dataset.productPage !== pageUrl;
    const needsProductSource = !source || BAD_SOURCE.test(source) || pageChanged;

    image.dataset.productPage = pageUrl;
    image.classList.remove('screenshot');
    image.onload = () => markLoaded(image);
    image.onerror = () => {
      const retry = Number(image.dataset.productRetry || 0) + 1;
      if (retry <= RETRY_LIMIT) loadProductOnlyImage(image, pageUrl, retry);
      else markUnavailable(image);
    };

    if (needsProductSource) loadProductOnlyImage(image, pageUrl, 0);
  };

  const scan = root => {
    if (root instanceof HTMLImageElement) enforceProductOnlyImage(root);
    root.querySelectorAll?.(PRODUCT_SELECTORS).forEach(enforceProductOnlyImage);
  };

  // Product cards use this global inline error handler. Override it so it never
  // falls back to a screenshot of the retailer page.
  window.imageError = image => {
    const pageUrl = resolveProductUrl(image);
    if (!pageUrl) return markUnavailable(image);
    const retry = Number(image.dataset.productRetry || 0) + 1;
    if (retry <= RETRY_LIMIT) loadProductOnlyImage(image, pageUrl, retry);
    else markUnavailable(image);
  };

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (node instanceof Element) scan(node);
      });
      if (mutation.type === 'attributes' && mutation.target instanceof HTMLImageElement) {
        enforceProductOnlyImage(mutation.target);
      }
    }
  });

  const start = () => {
    scan(document);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src']
    });
    document.addEventListener('click', () => setTimeout(() => scan(document), 80), true);
    setTimeout(() => scan(document), 800);
    setTimeout(() => scan(document), 2500);
  };

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', start)
    : start();
})();
