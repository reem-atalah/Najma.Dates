const header = document.querySelector('.site-header');
const whiteFridayOverlay = document.querySelector('[data-white-friday-overlay]');
document.querySelector('[data-white-friday-dismiss]')?.addEventListener('click', () => whiteFridayOverlay?.remove());
const menuToggle = document.querySelector('.menu-toggle');
const searchPanel = document.querySelector('.search-panel');
const searchToggle = document.querySelector('.search-toggle');
const searchInput = document.querySelector('#site-search');
const searchResults = document.createElement('div');
const cartCount = document.querySelector('.cart-count');
const cartButton = document.querySelector('.cart-button');
const cartOverlay = document.querySelector('.cart-overlay');
const cartDrawer = document.querySelector('.cart-drawer');
const cartItems = document.querySelector('.cart-items');
const cartEmpty = document.querySelector('.cart-empty');
const cartSummary = document.querySelector('.cart-summary');
const toast = document.querySelector('.toast');
const cart = [];
const temporaryStockLimits = { 'مجدول بريميوم|1 كجم — لارج': 2 };
const stockKey = (item) => `${item.name}|${item.variant || ''}`;
const stockInCart = (key) => cart.reduce((sum, item) => sum + (stockKey(item) === key ? item.quantity : 0), 0);
const currencyFormatter = new Intl.NumberFormat('en-US');
// Keep mail requests on the same Cloudflare Pages origin as the storefront.
const API_BASE_URL = '';
let originalPageTitle = document.title;
const arabicGlossaryPattern = /(^|[^\u0621-\u064A])((?:وبال|وفال|وكال|ولل|وال|بال|فال|كال|لل|وب|وف|وك|ول|و|ف|ب|ك|ل)?(?:ال)?(?:تمر|تمور|مجدول|سيوي))(?=$|[^\u0621-\u064A])/g;
const productCatalog = window.productCatalog;
let toastTimer;
const dateTermAttributes = ['alt', 'aria-label', 'title', 'placeholder'];

document.querySelectorAll('.announcement').forEach((announcement) => {
  if (announcement.querySelector('.white-friday-announcement')) return;
  const link = document.createElement('a');
  link.className = 'white-friday-announcement';
  link.href = 'offers.html';
  link.textContent = 'عروض الجمعة البيضاء';
  announcement.append(link);
});

document.querySelectorAll('.main-nav').forEach((nav) => {
  if (nav.querySelector('a[href="offers.html"]')) return;
  const offersLink = document.createElement('a');
  offersLink.href = 'offers.html';
  offersLink.textContent = 'العروض';
  const aboutLink = nav.querySelector('a[href="about.html"]');
  nav.insertBefore(offersLink, aboutLink || null);
});

document.querySelectorAll('.mobile-nav').forEach((nav) => {
  if (nav.querySelector('a[href="offers.html"]')) return;
  const offersLink = document.createElement('a');
  offersLink.href = 'offers.html';
  offersLink.textContent = 'العروض';
  nav.insertBefore(offersLink, nav.querySelector('button') || null);
});

searchResults.className = 'search-results';
searchResults.id = 'site-search-results';
searchResults.setAttribute('role', 'status');
searchResults.setAttribute('aria-live', 'polite');
searchResults.hidden = true;
searchPanel.append(searchResults);
searchInput.setAttribute('aria-controls', searchResults.id);

function normalizeSearchText(value) {
  return value
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[0-9]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .trim();
}

function getSearchableOptionText(options = []) {
  return options.flatMap((option) => [
    option.label,
    option.content,
    option.price,
    ...getSearchableOptionText(option.children || [])
  ]).filter(Boolean);
}

function renderSearchResults(query) {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  searchResults.replaceChildren();

  if (!terms.length) {
    searchResults.hidden = true;
    return;
  }

  const matches = Object.entries(productCatalog).filter(([id, product]) => {
    const searchableText = normalizeSearchText([
      id,
      product.name,
      product.category,
      product.weight,
      product.description,
      getSearchableOptionText(product.options).join(' ')
    ].filter(Boolean).join(' '));
    return terms.every((term) => searchableText.includes(term));
  });

  if (!matches.length) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'search-no-results';
    emptyMessage.textContent = 'لم نعثر على منتجات تطابق بحثكم.';
    searchResults.append(emptyMessage);
    searchResults.hidden = false;
    return;
  }

  matches.forEach(([id, product]) => {
    const result = document.createElement('a');
    result.className = 'search-result';
    result.href = `product.html?product=${encodeURIComponent(id)}`;

    const name = document.createElement('span');
    name.textContent = product.name;
    const category = document.createElement('small');
    category.textContent = product.category;

    result.append(name, category);
    searchResults.append(result);
  });
  searchResults.hidden = false;
}

function getProductOption(product, label) {
  return product.options?.flatMap((option) => option.children || [option])
    .find((option) => option.label === label || option.id === label || option.legacyLabels?.includes(label));
}

function getCartWeightGrams() {
  return cart.reduce((total, item) => {
    const product = Object.values(productCatalog).find((candidate) => candidate.name === item.name);
    const option = product && getProductOption(product, item.variant || '');
    return total + (option?.weightGrams || product?.weightGrams || 0) * item.quantity;
  }, 0);
}

function replaceArabicGlossaryTermsWithEnglish(value) {
  return value.replace(arabicGlossaryPattern, (match, prefix, term) => {
    return `${prefix}${translateArabicGlossaryTerm(term)}`;
  });
}

function translateArabicGlossaryTerm(term) {
  const prefixes = [
    ['وبال', 'with'],
    ['وفال', 'then'],
    ['وكال', 'like'],
    ['ولل', 'for'],
    ['وال', 'and'],
    ['بال', 'with'],
    ['كال', 'like'],
    ['فال', 'then'],
    ['لل', 'for'],
    ['وب', 'and with'],
    ['وف', 'and then'],
    ['وك', 'and like'],
    ['ول', 'and for'],
    ['و', 'and'],
    ['ف', 'then'],
    ['ب', 'with'],
    ['ك', 'like'],
    ['ل', 'for']
  ];
  let englishPrefix = '';
  let root = term;
  for (const [arabicPrefix, translatedPrefix] of prefixes) {
    if (!term.startsWith(arabicPrefix)) continue;
    const remaining = term.slice(arabicPrefix.length).replace(/^ال/, '');
    if (/^(?:تمر|تمور|مجدول|سيوي)$/.test(remaining)) {
      englishPrefix = `${translatedPrefix} `;
      root = remaining;
      break;
    }
  }
  root = root.replace(/^ال/, '');
  const englishTerm = root === 'تمر' || root === 'تمور'
    ? 'Dates'
    : root === 'مجدول'
      ? 'Majdool'
      : 'siwi';
  return `${englishPrefix}${englishTerm}`;
}

function updateDateTermTranslations() {
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');
  document.title = isEnglish ? replaceArabicGlossaryTermsWithEnglish(originalPageTitle) : originalPageTitle;
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    const originalDescription = metaDescription.dataset.originalContent || metaDescription.content;
    metaDescription.dataset.originalContent = originalDescription;
    metaDescription.content = isEnglish
      ? replaceArabicGlossaryTermsWithEnglish(originalDescription)
      : originalDescription;
  }
  document.querySelectorAll('.date-term').forEach((term) => {
    term.textContent = isEnglish ? term.dataset.en : term.dataset.ar;
  });
  document.querySelectorAll('[data-date-term-alt], [data-date-term-aria-label], [data-date-term-title], [data-date-term-placeholder]').forEach((element) => {
    dateTermAttributes.forEach((attribute) => {
      const key = `dateTerm${attribute.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('')}`;
      const original = element.dataset[key];
      if (original) {
        element.setAttribute(attribute, isEnglish ? replaceArabicGlossaryTermsWithEnglish(original) : original);
      }
    });
  });
}

function protectDateTerms(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.parentElement.closest('.date-term, script, style, textarea')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    }
  });
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach((textNode) => {
    const matches = [...textNode.textContent.matchAll(arabicGlossaryPattern)];
    if (!matches.length) return;

    const fragment = document.createDocumentFragment();
    let cursor = 0;
    matches.forEach((match) => {
      fragment.append(textNode.textContent.slice(cursor, match.index), match[1]);
      const term = document.createElement('span');
      term.className = 'notranslate date-term';
      term.setAttribute('translate', 'no');
      term.dataset.ar = match[2];
      term.dataset.en = translateArabicGlossaryTerm(match[2]);
      term.textContent = document.documentElement.lang.toLowerCase().startsWith('en')
        ? term.dataset.en
        : match[2];
      fragment.append(term);
      cursor = match.index + match[0].length;
    });
    fragment.append(textNode.textContent.slice(cursor));
    textNode.replaceWith(fragment);
  });
}

function protectDateTermAttributes(root) {
  const selector = '[alt], [aria-label], [title], [placeholder]';
  const elements = Array.from(root.querySelectorAll(selector));
  if (root.matches && root.matches(selector)) elements.unshift(root);

  elements.forEach((element) => {
    dateTermAttributes.forEach((attribute) => {
      const value = element.getAttribute(attribute);
      if (value && /(?:وبال|وفال|وكال|ولل|وال|بال|فال|كال|لل|وب|وف|وك|ول|و|ف|ب|ك|ل)?(?:ال)?(?:تمر|تمور|مجدول|سيوي)/.test(value)) {
        const key = `dateTerm${attribute.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('')}`;
        element.dataset[key] = value;
      }
    });
  });
}

protectDateTerms(document.body);
protectDateTermAttributes(document.body);

const productDetail = document.querySelector('[data-product-detail]');
const directOrderUrl = new URL(window.location.href);
const isDirectOrderPage = directOrderUrl.pathname.endsWith('/order.html') || directOrderUrl.pathname === '/order.html';
if (isDirectOrderPage) {
  document.body.dataset.productId = directOrderUrl.searchParams.get('product') || 'majdool-premium';
  document.body.dataset.productVariant = directOrderUrl.searchParams.get('variant') || 'jumbo-1kg';
}
if (productDetail) {
  const productUrl = new URL(window.location.href);
  const cleanProductId = productUrl.pathname.match(/^\/product-([^/.]+)$/)?.[1];
  const premiumVariantAliases = { 'jumbo-1k': 'jumbo-1kg' };
  const variantCandidates = [
    productUrl.searchParams.get('variant'),
    ...[...productUrl.searchParams.keys()].filter((key) => key !== 'product' && key !== 'variant')
  ].filter(Boolean).map((variant) => premiumVariantAliases[variant] || variant);
  const inferredProductId = Object.entries(productCatalog).find(([, candidate]) => {
    const options = candidate.options.flatMap((option) => option.children || [option]);
    return variantCandidates.some((variant) => options.some((option) => option.id === variant));
  })?.[0];
  const productId = productUrl.searchParams.get('product') || cleanProductId || document.body.dataset.productId
    || (productUrl.pathname === '/product' ? inferredProductId : undefined);
  const product = productCatalog[productId];
  const cleanProductPaths = {
    'majdool-premium': '/product-majdool-premium',
    'majdool-jumbo': '/product-majdool-jumbo',
    'siwi-premium': '/product-siwi-premium'
  };
  const bareVariant = product && [...productUrl.searchParams.keys()].find((key) => (
    getProductOption(product, premiumVariantAliases[key] || key)
  ));
  const requestedVariant = productUrl.searchParams.get('variant')
    || (bareVariant ? (premiumVariantAliases[bareVariant] || bareVariant) : '');
  const notFound = document.querySelector('[data-product-not-found]');
  if (!product) {
    productDetail.hidden = true;
    notFound.hidden = false;
  } else {
    document.title = `${product.name} — نجمة التمور`;
    originalPageTitle = document.title;
    document.querySelector('.product-detail-category-link').href = product.categoryUrl;
    document.querySelector('.product-detail-category-link').textContent = product.category;
    document.querySelector('.product-detail-breadcrumb').textContent = product.name;
    productDetail.querySelector('.product-detail-name').textContent = product.name;
    productDetail.querySelector('.product-detail-description').textContent = product.description;
    productDetail.querySelector('.product-detail-weight').textContent = product.weight;
    const priceElement = productDetail.querySelector('.product-detail-price');
    const dealElement = document.createElement('div');
    dealElement.className = 'product-detail-deal';
    dealElement.hidden = true;
    priceElement.insertAdjacentElement('afterend', dealElement);
    const stockElement = document.createElement('p');
    stockElement.className = 'stock-alert';
    stockElement.hidden = true;
    dealElement.insertAdjacentElement('afterend', stockElement);
    const updateProductDeal = (option) => {
      const originalPrice = option?.originalPrice ?? product.originalPrice;
      const currentPrice = option?.price ?? product.price;
      if (!Number.isFinite(originalPrice) || !Number.isFinite(currentPrice) || originalPrice <= currentPrice) {
        dealElement.hidden = true;
        dealElement.replaceChildren();
        return;
      }
      const savedAmount = originalPrice - currentPrice;
      const percentSaved = Math.round((savedAmount / originalPrice) * 100);
      const oldPrice = document.createElement('del');
      oldPrice.textContent = `${currencyFormatter.format(originalPrice)} جنيه`;
      const savings = document.createElement('span');
      savings.className = 'product-detail-savings';
      savings.textContent = `التوفير: ${currencyFormatter.format(savedAmount)} جنيه`;
      const discount = document.createElement('span');
      discount.className = 'discount-badge';
      discount.textContent = `-${currencyFormatter.format(percentSaved)}% وفر`;
      dealElement.replaceChildren(oldPrice, savings, discount);
      dealElement.hidden = false;
    };
    const hasOptions = Boolean(product.options);
    priceElement.textContent = hasOptions
      ? 'اختر خيارًا لعرض السعر'
      : `${currencyFormatter.format(product.price)} جنيه`;
    const image = productDetail.querySelector('.product-detail-image');
    const productImages = product.images?.length ? product.images : [product.image];
    let galleryIndex = 0;
    const galleryPagination = productDetail.querySelector('[data-product-gallery-pagination]');
    const galleryCount = galleryPagination.querySelector('[data-gallery-count]');
    const galleryDots = galleryPagination.querySelector('[data-gallery-dots]');
    const galleryArrows = productDetail.querySelectorAll('[data-gallery-step]');
    galleryPagination.hidden = productImages.length < 2;
    galleryArrows.forEach((arrow) => { arrow.hidden = productImages.length < 2; });

    const showGalleryImage = (index) => {
      galleryIndex = (index + productImages.length) % productImages.length;
      image.src = productImages[galleryIndex];
      image.alt = `${product.name} — الصورة ${currencyFormatter.format(galleryIndex + 1)}`;
      galleryCount.textContent = `${currencyFormatter.format(galleryIndex + 1)} / ${currencyFormatter.format(productImages.length)}`;
      galleryDots.querySelectorAll('button').forEach((dot, dotIndex) => {
        const isActive = dotIndex === galleryIndex;
        dot.classList.toggle('is-active', isActive);
        dot.setAttribute('aria-current', String(isActive));
      });
    };

    productImages.forEach((imageSrc, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'product-gallery-dot';
      dot.setAttribute('aria-label', `عرض الصورة ${currencyFormatter.format(index + 1)} من ${product.name}`);
      dot.addEventListener('click', () => showGalleryImage(index));
      galleryDots.append(dot);
    });
    galleryArrows.forEach((arrow) => {
      arrow.addEventListener('click', () => {
        showGalleryImage(galleryIndex + Number(arrow.dataset.galleryStep));
      });
    });
    showGalleryImage(0);
    const addToCart = productDetail.querySelector('.quick-add');
    addToCart.dataset.product = product.name;
    addToCart.dataset.price = hasOptions ? '' : String(product.price);
    addToCart.dataset.addQuantity = '1';
    addToCart.setAttribute('aria-label', `أضف ${product.name} إلى الحقيبة`);
    let selectedQuantity = 1;
    let displayedOptionLabel = addToCart.dataset.option || product.weight;
    const orderSummary = productDetail.querySelector('[data-direct-order-summary]');
    let orderSummaryRequested = isDirectOrderPage;
    const refreshShippingEstimate = () => window.setTimeout(updateShippingEstimate, 0);
    const updateOrderSummary = (show = false) => {
      if (!orderSummary) return;
      const optionLabel = addToCart.dataset.option || displayedOptionLabel;
      const optionPrice = Number(addToCart.dataset.price);
      const selectedOption = getProductOption(product, addToCart.dataset.option || '');
      const hasAvailableSelection = Number.isFinite(optionPrice) && optionPrice > 0 && !selectedOption?.soldOut;
      orderSummary.querySelector('[data-direct-order-name]').textContent = product.name;
      orderSummary.querySelector('[data-direct-order-option]').textContent = optionLabel;
      orderSummary.querySelector('[data-direct-order-quantity]').textContent = currencyFormatter.format(selectedQuantity);
      orderSummary.querySelector('[data-direct-order-subtotal]').textContent = hasAvailableSelection
        ? `${currencyFormatter.format(optionPrice * selectedQuantity)} جنيه`
        : 'يتحدد بعد اختيار العرض';
      if (show) orderSummaryRequested = true;
      orderSummary.hidden = !orderSummaryRequested || !hasAvailableSelection;
    };
    const quantityDisplay = productDetail.querySelector('[data-product-quantity-value]');
    productDetail.querySelectorAll('[data-product-quantity]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedQuantity = button.dataset.productQuantity === 'increase'
          ? Math.min(99, selectedQuantity + 1)
          : Math.max(1, selectedQuantity - 1);
        quantityDisplay.textContent = currencyFormatter.format(selectedQuantity);
        addToCart.dataset.addQuantity = String(selectedQuantity);
        updateOrderSummary();
        refreshShippingEstimate();
        const nextUrl = new URL(window.location.href);
        if (selectedQuantity === 1) nextUrl.searchParams.delete('quantity');
        else nextUrl.searchParams.set('quantity', String(selectedQuantity));
        window.history.replaceState({}, '', nextUrl);
      });
    });
    const selectedQuantityFromUrl = Number(productUrl.searchParams.get('quantity'));
    if (Number.isInteger(selectedQuantityFromUrl) && selectedQuantityFromUrl > 1 && selectedQuantityFromUrl <= 99) {
      selectedQuantity = selectedQuantityFromUrl;
      quantityDisplay.textContent = currencyFormatter.format(selectedQuantity);
      addToCart.dataset.addQuantity = String(selectedQuantity);
    }
    const optionGroup = productDetail.querySelector('[data-product-options]');
    let optionButtons;
    let subOptionButtons;
    if (hasOptions) {
      optionGroup.hidden = false;
      optionButtons = optionGroup.querySelector('[data-option-buttons]');
      const optionSubgroup = optionGroup.querySelector('[data-option-subgroup]');
      subOptionButtons = optionSubgroup.querySelector('[data-sub-option-buttons]');
      const optionContent = optionGroup.querySelector('[data-option-content]');
      product.options.forEach((option) => {
        const optionButton = document.createElement('button');
        optionButton.type = 'button';
        optionButton.className = 'product-option-button';
        optionButton.dataset.productOptionGroup = option.label;
        optionButton.dataset.productOptionId = option.id || '';
        optionButton.setAttribute('aria-pressed', 'false');
        optionButton.textContent = option.label;
        if (option.children) {
          optionButton.setAttribute('aria-expanded', 'false');
        } else {
          optionButton.dataset.productOption = option.label;
        }
        optionButtons.append(optionButton);

        option.children?.forEach((child) => {
          const subOptionButton = document.createElement('button');
          subOptionButton.type = 'button';
          subOptionButton.className = 'product-option-button';
          subOptionButton.dataset.productOption = child.label;
          subOptionButton.dataset.productOptionGroup = option.label;
          subOptionButton.dataset.productOptionId = child.id || '';
          subOptionButton.setAttribute('aria-pressed', 'false');
          subOptionButton.textContent = child.soldOut ? `${child.label} — نفدت الكمية` : child.label;
          subOptionButton.disabled = Boolean(child.soldOut);
          if (child.soldOut) subOptionButton.setAttribute('aria-disabled', 'true');
          subOptionButtons.append(subOptionButton);
        });
      });

      optionGroup.addEventListener('click', (event) => {
        const selectedButton = event.target.closest('[data-product-option-group]');
        if (!selectedButton) return;
        const groupLabel = selectedButton.dataset.productOptionGroup;
        const isOfferGroup = selectedButton.hasAttribute('aria-expanded');
        const optionSelection = optionGroup.querySelector('[data-option-selection]');

        optionButtons.querySelectorAll('button').forEach((optionButton) => {
          const isSelected = optionButton === selectedButton
            || (!isOfferGroup && optionButton.dataset.productOptionGroup === groupLabel);
          optionButton.classList.toggle('is-selected', isSelected);
          optionButton.setAttribute('aria-pressed', String(isSelected));
          if (optionButton.hasAttribute('aria-expanded')) {
            optionButton.setAttribute('aria-expanded', String(isSelected));
          }
        });
        subOptionButtons.querySelectorAll('button').forEach((optionButton) => {
          const isSelected = optionButton === selectedButton;
          optionButton.classList.toggle('is-selected', isSelected);
          optionButton.setAttribute('aria-pressed', String(isSelected));
        });

        if (isOfferGroup) {
          addToCart.disabled = false;
          addToCart.textContent = 'أضف إلى الحقيبة';
          const orderNowButton = productDetail.querySelector('.product-order-now');
          if (orderNowButton) {
            orderNowButton.disabled = false;
            orderNowButton.textContent = 'اطلب الآن';
          }
          optionSubgroup.hidden = false;
          addToCart.dataset.option = '';
          addToCart.dataset.price = '';
          displayedOptionLabel = groupLabel;
          updateOrderSummary();
          refreshShippingEstimate();
          priceElement.textContent = 'اختر أحد العروض لعرض السعر';
          updateProductDeal(null);
          if (optionSelection) optionSelection.textContent = 'اختر أحد العروض';
          if (optionContent) optionContent.hidden = true;
          productDetail.querySelector('.product-detail-weight').textContent = groupLabel;
          const nextUrl = new URL(window.location.href);
          if (cleanProductPaths[productId] && !isDirectOrderPage) {
            nextUrl.pathname = cleanProductPaths[productId];
            nextUrl.search = `group=${encodeURIComponent(groupLabel)}`;
          } else {
            nextUrl.searchParams.set('group', groupLabel);
            nextUrl.searchParams.delete('variant');
          }
          window.history.replaceState({}, '', nextUrl);
          return;
        }

        const selectedOption = getProductOption(product, selectedButton.dataset.productOption);
        if (!selectedOption) return;
        productDetail.classList.toggle('is-sold-out', Boolean(selectedOption.soldOut));
        stockElement.textContent = selectedOption.stockMessage || (selectedOption.soldOut ? 'نفدت الكمية' : '');
        stockElement.hidden = !stockElement.textContent;
        addToCart.disabled = Boolean(selectedOption.soldOut);
        addToCart.textContent = selectedOption.soldOut ? 'نفدت الكمية' : 'أضف إلى الحقيبة';
        const orderNowButton = productDetail.querySelector('.product-order-now');
        if (orderNowButton) {
          orderNowButton.disabled = Boolean(selectedOption.soldOut);
          orderNowButton.textContent = selectedOption.soldOut ? 'نفدت الكمية' : 'اطلب الآن';
        }
        const selectedGroup = product.options.find((option) => option.label === groupLabel);
        optionSubgroup.hidden = !selectedGroup?.children;
        selectedButton.classList.add('is-selected');
        selectedButton.setAttribute('aria-pressed', 'true');
        addToCart.dataset.option = selectedOption.label;
        addToCart.dataset.price = String(selectedOption.price);
        displayedOptionLabel = selectedOption.label;
        updateOrderSummary();
        refreshShippingEstimate();
        priceElement.textContent = `${currencyFormatter.format(selectedOption.price)} جنيه`;
        updateProductDeal(selectedOption);
        if (optionSelection) optionSelection.textContent = selectedOption.label;
        productDetail.querySelector('.product-detail-weight').textContent = selectedOption.label;
        if (optionContent) {
          optionContent.textContent = selectedOption.content || '';
          optionContent.hidden = !selectedOption.content;
        }
        const nextUrl = new URL(window.location.href);
        if (cleanProductPaths[productId] && !isDirectOrderPage) {
          nextUrl.pathname = cleanProductPaths[productId];
          nextUrl.search = selectedOption.id === 'jumbo-1kg' ? 'jumbo-1k' : (selectedOption.id || selectedOption.label);
        } else {
          nextUrl.searchParams.set('variant', selectedOption.id || selectedOption.label);
          nextUrl.searchParams.delete('group');
        }
        window.history.replaceState({}, '', nextUrl);
      });
    }
    const initialVariant = requestedVariant || document.body.dataset.productVariant;
    const initialOption = initialVariant && getProductOption(product, initialVariant);
    if (initialOption) {
      const parentGroup = product.options.find((option) => option.children?.includes(initialOption));
      if (parentGroup) {
        const groupButton = [...optionButtons.querySelectorAll('button')]
          .find((button) => button.dataset.productOptionGroup === parentGroup.label);
        const childButton = [...subOptionButtons.querySelectorAll('[data-product-option]')]
          .find((button) => button.dataset.productOption === initialOption.label);
        groupButton?.click();
        if (childButton?.disabled) childButton.disabled = false;
        childButton?.click();
        if (initialOption.soldOut && childButton) childButton.disabled = true;
      } else {
        const variantButton = [...optionButtons.querySelectorAll('[data-product-option]')]
          .find((button) => button.dataset.productOption === initialOption.label);
        variantButton?.click();
      }
      if (cleanProductPaths[productId] && !isDirectOrderPage) {
        const canonicalUrl = new URL(cleanProductPaths[productId], window.location.origin);
        canonicalUrl.search = initialOption.id === 'jumbo-1kg' ? 'jumbo-1k' : (initialOption.id || initialOption.label);
        window.history.replaceState({}, '', canonicalUrl);
      }
    }
    if (!initialOption) {
      const preferredId = productId === 'majdool-premium' ? 'jumbo-1kg'
        : productId === 'majdool-jumbo' ? '800g'
          : productId === 'siwi-premium' ? '5kg' : null;
      const preferred = preferredId && getProductOption(product, preferredId);
      if (preferred) {
        displayedOptionLabel = preferred.label;
        addToCart.dataset.option = preferred.label;
        addToCart.dataset.price = String(preferred.price);
        priceElement.textContent = `${currencyFormatter.format(preferred.price)} جنيه`;
        updateProductDeal(preferred);
        productDetail.querySelector('.product-detail-weight').textContent = preferred.label;
        const preferredButton = [...optionButtons.querySelectorAll('[data-product-option]')]
          .find((button) => button.dataset.productOption === preferred.label);
        preferredButton?.classList.add('is-selected');
        preferredButton?.setAttribute('aria-pressed', 'true');
        if (cleanProductPaths[productId] && !isDirectOrderPage) {
          const variantUrl = new URL(cleanProductPaths[productId], window.location.origin);
          variantUrl.search = preferred.id === 'jumbo-1kg' ? 'jumbo-1k' : preferred.id;
          window.history.replaceState({}, '', variantUrl);
        }
      }
    }
    updateOrderSummary(isDirectOrderPage || Boolean(productDetail.querySelector('.product-order-form-container')));
    protectDateTerms(document.body);
    protectDateTermAttributes(document.body);
  }
}

const languageObserver = new MutationObserver(updateDateTermTranslations);
languageObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['lang']
});
updateDateTermTranslations();
const contentObserver = new MutationObserver((records) => {
  records.forEach((record) => {
    record.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        protectDateTerms(node);
        protectDateTermAttributes(node);
      }
      const parentElement = node.parentElement;
      if (
        node.nodeType === Node.TEXT_NODE
        && parentElement
        && /(?:وبال|وفال|وكال|ولل|وال|بال|فال|كال|لل|وب|وف|وك|ول|و|ف|ب|ك|ل)?(?:ال)?(?:تمر|تمور|مجدول|سيوي)/.test(node.textContent)
      ) {
        protectDateTerms(parentElement);
        protectDateTermAttributes(parentElement);
      }
    });
  });
});
contentObserver.observe(document.body, { childList: true, subtree: true });

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function reportCartStorageError(action, error) {
  console.error(`Unable to ${action} the saved shopping bag.`, error);
  if (action === 'load') showToast('تعذّر تحميل حقيبة التسوق القديمة. ابدأ حقيبة جديدة.');
  else showToast('تعذّر حفظ حقيبة التسوق على هذا الجهاز.');
}

function discardSavedCart() {
  try {
    window.localStorage.removeItem('najma-dates-cart');
  } catch (error) {
    console.warn('Unable to remove the invalid saved shopping bag.', error);
  }
}

function loadSavedCart() {
  try {
    const savedCart = window.localStorage.getItem('najma-dates-cart');
    if (savedCart === null) return;

    let items;
    try {
      items = JSON.parse(savedCart);
    } catch {
      discardSavedCart();
      showToast('بيانات الحقيبة القديمة غير صالحة. ابدأ حقيبة جديدة.');
      return;
    }
    if (!Array.isArray(items)) {
      discardSavedCart();
      showToast('بيانات الحقيبة القديمة غير صالحة. ابدأ حقيبة جديدة.');
      return;
    }

    const restoredItems = [];
    items.forEach((item) => {
      const product = Object.values(productCatalog).find((candidate) => (
        candidate.name === item?.name || candidate.legacyNames?.includes(item?.name)
      ));
      const variant = item?.variant || '';
      let selectedOption = variant ? getProductOption(product || {}, variant) : null;
      if (product?.options && !selectedOption) {
        const productId = Object.keys(productCatalog).find((id) => productCatalog[id] === product);
        const preferredId = productId === 'majdool-premium' ? 'jumbo-1kg'
          : productId === 'majdool-jumbo' ? '800g'
            : productId === 'siwi-premium' ? '5kg' : null;
        selectedOption = preferredId ? getProductOption(product, preferredId) : null;
      }
      const price = selectedOption?.price ?? product?.price;
      if (!product || selectedOption?.soldOut || (product.options ? !selectedOption : Boolean(variant))
        || !Number.isFinite(price) || !Number.isInteger(item.quantity) || item.quantity < 1) {
        return;
      }
      const normalizedVariant = selectedOption?.label || '';
      const displayName = item.displayName || (product.name.startsWith('عرض ال700') ? product.name : '');
      restoredItems.push({ name: product.name, displayName, price, image: product.image, variant: normalizedVariant, quantity: item.quantity });
    });
    cart.push(...restoredItems);
    if (restoredItems.length !== items.length) saveCart();
  } catch (error) {
    reportCartStorageError('load', error);
  }
}

function saveCart() {
  if (isDirectOrderPage) return;
  try {
    window.localStorage.setItem('najma-dates-cart', JSON.stringify(cart));
  } catch (error) {
    reportCartStorageError('save', error);
  }
}

const issuedOrderNumbers = new Set();
function createOrderNumber() {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  let millisecondsToday = now.getTime() - dayStart.getTime();
  let savedNumbers = [];
  try {
    const storedNumbers = JSON.parse(window.localStorage.getItem('najma-dates-order-numbers') || '[]');
    if (Array.isArray(storedNumbers)) savedNumbers = storedNumbers.filter((number) => typeof number === 'string');
  } catch (error) {
    console.warn('Unable to read the local order number history.', error);
  }

  let orderNumber;
  do {
    const random = new Uint32Array(1);
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(random);
    else random[0] = Math.floor(Math.random() * 0x100000000);
    const randomPart = String(random[0] % 10000).padStart(4, '0');
    orderNumber = `NJD-${datePart}-${String(millisecondsToday).padStart(8, '0')}-${randomPart}`;
    if (savedNumbers.includes(orderNumber) || issuedOrderNumbers.has(orderNumber)) millisecondsToday += 1;
    else break;
  } while (millisecondsToday < 86400000);

  if (millisecondsToday >= 86400000) throw new Error('تعذّر إنشاء رقم طلب جديد. حاول مرة أخرى.');
  issuedOrderNumbers.add(orderNumber);
  savedNumbers.push(orderNumber);
  try {
    window.localStorage.setItem('najma-dates-order-numbers', JSON.stringify(savedNumbers));
  } catch (error) {
    console.warn('Unable to save the local order number history.', error);
  }
  return orderNumber;
}

loadSavedCart();
let preservedCartForDirectOrder = null;
if (isDirectOrderPage) {
  preservedCartForDirectOrder = cart.map((item) => ({ ...item }));
  cart.length = 0;
}

function restoreDirectOrderCart() {
  if (!isDirectOrderPage || !preservedCartForDirectOrder) return;
  cart.length = 0;
  cart.push(...preservedCartForDirectOrder.map((item) => ({ ...item })));
  try {
    window.localStorage.setItem('najma-dates-cart', JSON.stringify(cart));
  } catch (error) {
    reportCartStorageError('save', error);
  }
  renderCart();
}

menuToggle.addEventListener('click', () => {
  const isOpen = header.classList.toggle('menu-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'إغلاق القائمة' : 'فتح القائمة');
});

document.querySelectorAll('.main-nav a, .mobile-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    header.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
  });
});

function toggleSearch() {
  searchPanel.hidden = !searchPanel.hidden;
  if (!searchPanel.hidden) searchInput.focus();
}
searchToggle.addEventListener('click', toggleSearch);
document.querySelector('.mobile-search')?.addEventListener('click', () => {
  searchPanel.hidden = false;
  searchInput.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.querySelector('.search-submit').addEventListener('click', () => {
  if (!searchInput.value.trim()) {
    searchInput.focus();
    return;
  }
  renderSearchResults(searchInput.value);
});
searchInput.addEventListener('input', () => renderSearchResults(searchInput.value));
searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') document.querySelector('.search-submit').click();
});

const productOrderFormContainer = document.querySelector('.product-order-form-container');
function createOrderForm() {
  const form = document.createElement('form');
  form.className = 'order-form';
  form.hidden = !productOrderFormContainer;
  form.innerHTML = `
    <h3>بيانات إتمام الطلب</h3>
    <label>الاسم الكامل<input name="name" autocomplete="name" maxlength="80" required /></label>
    <label>رقم الهاتف<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required /></label>
    <label>البريد الإلكتروني (اختياري لاستلام تفاصيل الطلب)<input name="email" type="email" autocomplete="email" maxlength="254" /></label>
    <label>منطقة التوصيل<select name="region" required><option value="">اختر المنطقة</option><option value="cairo_giza">القاهرة والجيزة</option><option value="delta_canal">الدلتا ومدن القناة</option><option value="border_areas">المناطق الحدودية (البحر الأحمر والساحل الشمالي والوادي الجديد ومرسى مطروح)</option><option value="upper_egypt">الصعيد</option><option value="sinai_arish">سيناء والعريش</option></select></label>
    <label>العنوان بالتفصيل<textarea name="address" autocomplete="street-address" maxlength="240" rows="3" required></textarea></label>
    <p class="order-shipping-estimate" aria-live="polite">تظهر رسوم الشحن بعد اختيار منطقة التوصيل.</p>
    <label>ملاحظة إضافية (اختياري)<textarea name="note" maxlength="160" rows="2"></textarea></label>
    <p class="order-form-status" role="status" aria-live="polite"></p>
    <button class="button order-submit" type="submit">اطلب الآن</button>
    <button class="continue-link order-cancel order-cancel-bottom" type="button">العودة إلى الحقيبة ↓</button>`;
  const directOrderSummary = document.querySelector('[data-direct-order-summary]');
  if ((isDirectOrderPage || productOrderFormContainer) && directOrderSummary) {
    form.querySelector('.order-submit').before(directOrderSummary);
  }
  (productOrderFormContainer || cartSummary).append(form);
  return form;
}

const orderForm = createOrderForm();
const orderNumberDisplay = document.createElement('p');
orderNumberDisplay.className = 'order-number-confirmation';
orderNumberDisplay.hidden = true;
orderNumberDisplay.setAttribute('role', 'status');
orderForm.prepend(orderNumberDisplay);
const checkoutButton = cartSummary.querySelector('.checkout-button');

function updateShippingEstimate() {
  let subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let weightGrams = getCartWeightGrams();
  if (!cart.length && productDetail) {
    const selectedButton = productDetail.querySelector('.product-detail-buy');
    const selectedProduct = Object.values(productCatalog).find((item) => item.name === selectedButton?.dataset.product);
    const selectedOption = selectedProduct && getProductOption(selectedProduct, selectedButton.dataset.option || '');
    const quantity = Number(selectedButton?.dataset.addQuantity) || 1;
    const price = Number(selectedButton?.dataset.price);
    const itemWeight = selectedOption?.weightGrams || selectedProduct?.weightGrams || 0;
    if (!selectedOption?.soldOut && Number.isFinite(price) && price > 0 && itemWeight > 0) {
      subtotal = price * quantity;
      weightGrams = itemWeight * quantity;
    }
  }
  const estimate = orderForm.querySelector('.order-shipping-estimate');
  const directSummary = orderForm.querySelector('[data-direct-order-summary]');
  const summaryShipping = directSummary?.querySelector('[data-direct-order-shipping]');
  const summaryTotal = directSummary?.querySelector('[data-direct-order-total]');
  const formatAmount = (amount) => `${currencyFormatter.format(amount)} جنيه`;
  if (subtotal > 2000) {
    estimate.textContent = 'مبروك، التوصيل مجاني لطلبكم لأن الطلب تعدى ال2000ج!';
    if (summaryShipping) summaryShipping.textContent = 'مجاني';
    if (summaryTotal) summaryTotal.textContent = formatAmount(subtotal);
    return;
  }
  const region = orderForm.elements.region.value;
  const shippingFee = window.najmaShipping.calculateShipping(region, weightGrams, subtotal);
  if (shippingFee === null) {
    estimate.textContent = 'تظهر رسوم الشحن بعد اختيار منطقة التوصيل.';
    if (summaryShipping) summaryShipping.textContent = 'اختر منطقة التوصيل';
    if (summaryTotal) summaryTotal.textContent = 'يتحدد بعد اختيار المنطقة';
    return;
  }
  estimate.textContent = `رسوم الشحن: ${shippingFee.toLocaleString('en-US')} جنيه.`;
  if (summaryShipping) summaryShipping.textContent = shippingFee === 0 ? 'مجاني' : formatAmount(shippingFee);
  if (summaryTotal) summaryTotal.textContent = formatAmount(subtotal + shippingFee);
}
orderForm.elements.region.addEventListener('change', updateShippingEstimate);
orderForm.elements.region.addEventListener('input', updateShippingEstimate);

function showOrderForm() {
  if (!isDirectOrderPage) checkoutButton.hidden = true;
  orderForm.querySelector('[data-direct-order-summary]')?.removeAttribute('hidden');
  orderForm.hidden = false;
  updateShippingEstimate();
  orderForm.querySelector('[name="name"]').focus();
}

function addToCartFromButton(button) {
  const selectedOption = button.dataset.option || '';
  const product = Object.values(productCatalog).find((candidate) => candidate.name === button.dataset.product);
  if (product && getProductOption(product, selectedOption)?.soldOut) {
    showToast('نفدت كمية هذا العرض.');
    return false;
  }
  const detailOptions = button.closest('[data-product-detail]')?.querySelectorAll('[data-product-option]');
  if (detailOptions?.length && !selectedOption) {
    showToast('يُرجى اختيار أحد الخيارات أولًا.');
    detailOptions[0].focus();
    return false;
  }
  const price = Number(button.dataset.price);
  if (!Number.isFinite(price) || price <= 0) {
    const productLink = button.closest('.product-image')?.querySelector('.product-image-link');
    if (productLink) {
      window.location.assign(productLink.href);
      return false;
    }
    showToast('تعذّر إضافة المنتج. يُرجى اختيار المنتج من صفحة التفاصيل.');
    return false;
  }
  const quantityToAdd = Number(button.dataset.addQuantity) || 1;
  if (!Number.isInteger(quantityToAdd) || quantityToAdd < 1 || quantityToAdd > 99) {
    showToast('يُرجى اختيار كمية من 1 إلى 99.');
    return false;
  }
  const stockKeyForButton = `${button.dataset.product}|${selectedOption}`;
  const stockLimit = temporaryStockLimits[stockKeyForButton];
  if (stockLimit && stockInCart(stockKeyForButton) + quantityToAdd > stockLimit) {
    showToast('الكمية المتاحة من مجدول اللارج كرتونتان فقط.');
    return false;
  }

  button.classList.remove('is-added');
  void button.offsetWidth;
  button.classList.add('is-added');
  window.setTimeout(() => button.classList.remove('is-added'), 700);
  const existingItem = cart.find((item) => (
    item.name === button.dataset.product && (item.variant || '') === selectedOption
  ));
  if (existingItem) {
    if (existingItem.quantity + quantityToAdd > 99) {
      showToast('لا يمكن إضافة أكثر من 99 من الخيار نفسه.');
      return false;
    }
    existingItem.quantity += quantityToAdd;
    if (button.dataset.cartDisplayName) existingItem.displayName = button.dataset.cartDisplayName;
  } else {
    const productImage = button.closest('.product-image')?.querySelector('img')
      || document.querySelector('.product-detail-image');
    cart.push({
      name: button.dataset.product,
      displayName: button.dataset.cartDisplayName || '',
      price,
      image: button.dataset.image || productImage?.getAttribute('src') || '',
      variant: selectedOption,
      quantity: quantityToAdd
    });
  }
  saveCart();
  renderCart();
  return true;
}

document.querySelectorAll('.quick-add').forEach((button) => {
  const needsOptionSelection = !button.dataset.price && !button.closest('[data-product-detail]');
  const addLabel = needsOptionSelection
    ? `اعرض تفاصيل ${button.dataset.product} للطلب`
    : `أضف ${button.dataset.product} إلى الحقيبة`;
  button.setAttribute('aria-label', addLabel);
  if (button.dataset.dateTermAriaLabel) button.dataset.dateTermAriaLabel = addLabel;

  button.addEventListener('click', () => {
    if (!addToCartFromButton(button)) return;
    openCart();
  });
});

const orderNowButton = document.querySelector('.product-order-now');
if (orderNowButton) {
  orderNowButton.addEventListener('click', () => {
    const addButton = productDetail.querySelector('.quick-add');
    if (!addToCartFromButton(addButton)) return;
    if (productOrderFormContainer && orderForm.parentElement !== productOrderFormContainer) {
      productOrderFormContainer.append(orderForm);
    }
    if (!cartOverlay.hidden) closeCart();
    showOrderForm();
    orderForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
if (isDirectOrderPage) {
  window.setTimeout(() => {
    orderNowButton?.click();
    productDetail?.querySelector('[data-product-options]')?.setAttribute('hidden', '');
    productDetail?.querySelector('.product-purchase-controls')?.setAttribute('hidden', '');
    orderNowButton?.setAttribute('hidden', '');
    orderForm.querySelectorAll('.order-cancel').forEach((button) => { button.hidden = true; });
  }, 0);
}

function renderCart() {
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const localizedItemCount = currencyFormatter.format(itemCount);
  cartCount.textContent = localizedItemCount;
  cartButton.setAttribute('aria-label', `حقيبة التسوق، ${localizedItemCount} منتجات`);
  document.querySelector('.drawer-count').textContent = `(${localizedItemCount})`;
  cartEmpty.hidden = itemCount > 0;
  cartSummary.hidden = itemCount === 0;
  cartItems.innerHTML = `<p class="cart-items-heading">المنتجات المختارة</p>${cart.map((item, index) => {
    const name = escapeHtml(item.name);
    const variant = item.variant ? ` — ${escapeHtml(item.variant)}` : '';
    const displayName = item.displayName ? escapeHtml(item.displayName) : `${name}${variant}`;
    const image = escapeHtml(item.image);
    return `
      <article class="cart-item">
        <div class="cart-item-image">${image ? `<img src="${image}" alt="${displayName}" />` : '<span aria-hidden="true">✳</span>'}</div>
        <div class="cart-item-details">
          <div class="cart-item-title"><h3>${displayName}</h3><strong>${currencyFormatter.format(item.price * item.quantity)} جنيه</strong></div>
          <p>الكمية: ${currencyFormatter.format(item.quantity)} × ${currencyFormatter.format(item.price)} جنيه</p>
          <div class="cart-item-controls">
            <div class="quantity-control" aria-label="الكمية من ${displayName}">
              <button data-cart-action="decrease" data-index="${index}" aria-label="تقليل كمية ${displayName}">−</button>
              <span>${currencyFormatter.format(item.quantity)}</span>
              <button data-cart-action="increase" data-index="${index}" aria-label="زيادة كمية ${displayName}">+</button>
            </div>
            <button class="remove-item" data-cart-action="remove" data-index="${index}">إزالة</button>
          </div>
        </div>
      </article>`;
  }).join('')}`;
  cartSummary.querySelector('.cart-subtotal strong').textContent = `${currencyFormatter.format(subtotal)} جنيه`;
  updateShippingEstimate();
}

function openCart() {
  cartOverlay.hidden = false;
  document.body.classList.add('cart-open');
  document.querySelector('.cart-close').focus();
}

function closeCart() {
  cartOverlay.hidden = true;
  document.body.classList.remove('cart-open');
  cartButton.focus();
}

cartButton.addEventListener('click', openCart);
document.querySelector('.cart-close').addEventListener('click', closeCart);
document.querySelector('.cart-backdrop').addEventListener('click', closeCart);
document.querySelectorAll('.continue-shopping, .cart-summary > .continue-link').forEach((button) => button.addEventListener('click', closeCart));

cartItems.addEventListener('click', (event) => {
  const control = event.target.closest('[data-cart-action]');
  if (!control) return;
  const index = Number(control.dataset.index);
  const item = cart[index];
  if (!item) return;
  if (control.dataset.cartAction === 'remove' || (control.dataset.cartAction === 'decrease' && item.quantity === 1)) {
    const row = control.closest('.cart-item');
    if (row.classList.contains('is-removing')) return;
    row.classList.add('is-removing');
    window.setTimeout(() => {
      const currentIndex = cart.indexOf(item);
      if (currentIndex !== -1) {
        cart.splice(currentIndex, 1);
        saveCart();
      }
      renderCart();
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 720);
    return;
  }
  if (control.dataset.cartAction === 'increase') {
    const key = stockKey(item);
    if (temporaryStockLimits[key] && stockInCart(key) >= temporaryStockLimits[key]) {
      showToast('الكمية المتاحة من مجدول اللارج كرتونتان فقط.');
      return;
    }
    item.quantity += 1;
  }
  if (control.dataset.cartAction === 'decrease') item.quantity -= 1;
  saveCart();
  renderCart();
});

checkoutButton.addEventListener('click', () => {
  if (orderForm.parentElement !== cartSummary) cartSummary.append(orderForm);
  showOrderForm();
});
orderForm.querySelectorAll('.order-cancel').forEach((button) => button.addEventListener('click', () => {
  orderForm.hidden = true;
  checkoutButton.hidden = false;
  checkoutButton.focus();
}));
orderForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!orderForm.reportValidity()) return;
  const submittedFromProductPage = Boolean(productOrderFormContainer && orderForm.parentElement === productOrderFormContainer);

  const submitButton = orderForm.querySelector('.order-submit');
  const status = orderForm.querySelector('.order-form-status');
  const formData = new FormData(orderForm);
  const orderNumber = createOrderNumber();
  if (productDetail) {
    const addButton = productDetail.querySelector('.quick-add');
    const selectedOption = addButton.dataset.option || '';
    const alreadyInCart = cart.some((item) => item.name === addButton.dataset.product && (item.variant || '') === selectedOption);
    if (!alreadyInCart && !addToCartFromButton(addButton)) return;
  }
  const payload = {
    name: formData.get('name'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    address: formData.get('address'),
    region: formData.get('region'),
    note: formData.get('note'),
    items: cart.map(({ name, variant, price, quantity }) => ({ name, variant, price, quantity })),
    orderNumber
  };
  submitButton.disabled = true;
  status.textContent = 'جارٍ إرسال الطلب إلى فريق نجمة التمور…';
  try {
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Unable to reach the order service.', error);
      throw new Error('تعذّر الاتصال بخدمة الطلبات. افتحوا المتجر من خلال الخادم وشغّلوا خدمة الطلبات، ثم أعيدوا المحاولة.');
    }

    const responseBody = await response.text();
    let result;
    try {
      result = responseBody.trim() ? JSON.parse(responseBody) : null;
    } catch {
      result = null;
    }
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      throw new Error(`تعذّر قراءة رد خدمة الطلبات (HTTP ${response.status}). يُرجى التأكد من تشغيل البريد الإلكتروني وإعداد الخادم.`);
    }
    if (!response.ok) {
      const errorMessage = response.status === 503
        ? 'خدمة البريد الإلكتروني غير مهيأة بعد. يُرجى التواصل مع المتجر.'
        : response.status === 429
          ? 'محاولات كثيرة لإرسال الطلب. يُرجى الانتظار قليلًا ثم المحاولة.'
          : result.error || 'تعذّر إرسال الطلب.';
      throw new Error(errorMessage);
    }
    cart.length = 0;
    if (isDirectOrderPage) restoreDirectOrderCart();
    else {
      saveCart();
      renderCart();
    }
    orderForm.reset();
    orderForm.hidden = true;
    checkoutButton.hidden = false;
    if (!cartOverlay.hidden) closeCart();
    orderNumberDisplay.textContent = `رقم طلبكم: ${orderNumber} — احتفظوا به للمتابعة.`;
    orderNumberDisplay.hidden = false;
    const customerEmail = formData.get('email');
    if (customerEmail) orderNumberDisplay.textContent += ` أرسلنا تفاصيل الطلب إلى ${customerEmail}.`;
    orderForm.hidden = false;
    if (!submittedFromProductPage) {
      cartOverlay.hidden = false;
      document.body.classList.add('cart-open');
    } else {
      orderForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    showToast('تم استلام طلبكم بنجاح.');
  } catch (error) {
    console.error('Unable to submit the email order.', error);
    status.textContent = error.message || 'تعذّر إرسال الطلب. يُرجى المحاولة لاحقًا.';
  } finally {
    submitButton.disabled = false;
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !cartOverlay.hidden) closeCart();
});

renderCart();

document.querySelectorAll('.carousel-arrow').forEach((button) => {
  button.addEventListener('click', () => {
    const grid = document.querySelector('.product-grid');
    const step = grid.querySelector('.product-card').getBoundingClientRect().width + 16;
    grid.scrollBy({ left: button.dataset.scroll === 'right' ? step : -step, behavior: 'smooth' });
  });
});

const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = document.querySelector('#newsletter-email');
    if (!email.checkValidity()) {
      email.reportValidity();
      return;
    }
    newsletterForm.querySelector('.form-message').textContent = 'تم تسجيلكم في القائمة — شكرًا لانضمامكم!';
    newsletterForm.reset();
  });
}

const contactForm = document.querySelector('.contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const status = contactForm.querySelector('.contact-form-message');
    const formData = new FormData(contactForm);
    submitButton.disabled = true;
    status.textContent = 'جارٍ إرسال رسالتكم…';
    try {
      const response = await fetch(`${API_BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          topic: formData.get('topic'),
          message: formData.get('message'),
          consent: formData.get('consent') === 'on'
        })
      });
      const responseBody = await response.text();
      let result;
      try {
        result = responseBody.trim() ? JSON.parse(responseBody) : null;
      } catch {
        result = null;
      }
      if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new Error(`تعذّر قراءة رد خدمة البريد الإلكتروني (HTTP ${response.status}).`);
      }
      if (!response.ok) {
        throw new Error(response.status === 503
          ? 'خدمة البريد الإلكتروني غير مهيأة بعد. يُرجى التواصل معنا مباشرة.'
          : response.status === 429
            ? 'محاولات كثيرة لإرسال الرسائل. يُرجى الانتظار قليلًا ثم المحاولة.'
            : result.error || 'تعذّر إرسال رسالتكم.');
      }
      contactForm.reset();
      status.textContent = 'شكرًا على رسالتكم! تم إرسالها إلى فريق نجمة التمور.';
    } catch (error) {
      console.error('Unable to send the contact message.', error);
      status.textContent = error.message || 'تعذّر إرسال الرسالة. يُرجى المحاولة لاحقًا.';
    } finally {
      submitButton.disabled = false;
    }
  });
}

document.querySelectorAll('.faq-group details').forEach((details) => {
  const summary = details.querySelector('summary');
  let closeTimer;
  summary.addEventListener('click', (event) => {
    event.preventDefault();
    window.clearTimeout(closeTimer);
    if (details.open && details.classList.contains('is-open')) {
      details.classList.remove('is-open');
      closeTimer = window.setTimeout(() => {
        if (!details.classList.contains('is-open')) details.open = false;
      }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 760);
      return;
    }
    details.open = true;
    requestAnimationFrame(() => details.classList.add('is-open'));
  });
});
if (document.querySelector('.faq-group details')) document.documentElement.classList.add('faq-motion-ready');

const revealTargets = document.querySelectorAll(
  '.hero-copy .eyebrow, .hero-copy h1, .hero-copy .hero-description, .hero-copy .hero-actions, .hero-note, .story-image-wrap, .story-copy, .section-heading, .collection-card, .product-card, .quote-section, .newsletter, .page-banner, .about-copy, .about-art, .value-grid article, .faq-group, .faq-help, .contact-details, .contact-form'
);

if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('motion-ready');

  revealTargets.forEach((element) => {
    element.dataset.reveal = element.classList.contains('story-copy') ? 'from-right' : 'up';
    const staggerSelector = element.matches('.collection-card')
      ? '.collection-card'
      : element.matches('.product-card')
        ? '.product-card'
        : element.matches('.value-grid article')
          ? 'article'
          : null;
    if (staggerSelector && element.parentElement) {
      const siblings = [...element.parentElement.children].filter((child) => child.matches(staggerSelector));
      element.style.setProperty('--reveal-delay', `${Math.min(siblings.indexOf(element), 3) * 110}ms`);
    }
  });

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });

  revealTargets.forEach((element) => revealObserver.observe(element));
}
