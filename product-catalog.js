(function setProductCatalog(global) {
  const productCatalog = {
    'majdool-premium': {
      name: 'مجدول بريميوم',
      legacyNames: ['مجدول بريميوم 1كج'],
      image: 'WhatsApp%20Image%202026-11-13%20at%203.23.20%20PM.jpeg',
      images: [
        'WhatsApp%20Image%202026-11-09%20at%203.25.56%20AM.jpeg',
        'WhatsApp%20Image%202026-11-13%20at%203.23.20%20PM.jpeg',
        // 'photo_6046412473952309919_y.jpg',
        'photo_6046412473952309925_y.jpg',
        'photo_6046412473952309924_y.jpg',
        'photo_6046412473952309921_y.jpg',
        'photo_6046412473952309928_y.jpg'
      ],
      options: [
        { id: 'jumbo-1kg', label: '1 كجم — جامبو', legacyLabels: ['جامبو'], price: 450, originalPrice: 700, weightGrams: 1000 },
        { id: 'large-1kg', label: '1 كجم — لارج', legacyLabels: ['لارج'], price: 350, originalPrice: 550, weightGrams: 1000, stockMessage: 'متبقي كرتونتين بس' },
        {
          label: 'عروض',
          isOfferGroup: true,
          children: [
            {
              id: 'family-large',
              isOffer: true,
              label: 'عرض العيلة (3 عبوات لارج = 3 كجم)',
              price: 1000,
              originalPrice: 1650,
              weightGrams: 3000,
              soldOut: true,
              content: 'بـ 1000 جنيه بدلاً من 1650 جنيه'
            },
            {
              id: 'family-jumbo',
              isOffer: true,
              label: 'عرض العيلة (3 عبوات جامبو = 3 كجم)',
              price: 1250,
              originalPrice: 2100,
              weightGrams: 3000,
              content: 'بـ 1250 جنيه بدلاً من 2100 جنيه'
            }
          ]
        }
      ],
      category: 'تمور المجدول',
      categoryUrl: 'majdool-dates.html',
      weight: 'اختر العبوة',
      description: 'تمر مجدول بريميوم مختار بعناية، بطعمه الغني وقوامه الطري.'
    },
    'majdool-jumbo': {
      name: 'مجدول جوسي جامبو',
      legacyNames: ['مجدول جوسي جامبو 800 جم'],
      image: 'photo_6032724400295055833_y%20%281%29.jpg',
      images: [
        'photo_6032724400295055833_y%20%281%29.jpg',
        'WhatsApp%20Imag%202026-11-09%20at%203.25.56%20AM.jpeg'
      ],
      options: [
        { id: '800g', label: '800 جم', price: 400, originalPrice: 600, weightGrams: 800 },
        {
          id: 'jumbo-saver',
          isOffer: true,
          label: 'عرض التوفير (3 عبوات = 2.4 كجم)',
          price: 1100,
          originalPrice: 1800,
          weightGrams: 2400,
          content: 'بـ 1100 جنيه بدلا من 1800 جنيه'
        }
      ],
      category: 'تمور المجدول',
      categoryUrl: 'majdool-dates.html',
      weight: '800 جم',
      description: 'حبات مجدول جامبو طرية وغنية، مناسبة للمشاركة والاستمتاع بها في أي وقت.'
    },
    'gift-jumbo-fresh-700': {
      name: 'عرض ال700 - جامبو + فريش جوسي',
      image: 'photo_6046412473952309919_y.jpg',
      options: [
        { id: 'jumbo-plus-fresh', label: 'كرتونة جامبو + علبة فريش جوسي', price: 700, weightGrams: 1800 }
      ],
      category: 'العروض',
      categoryUrl: 'offers.html',
      weight: '1.8 كجم',
      description: 'كرتونة مجدول بريميوم جامبو مع علبة مجدول فريش جوسي.'
    },
    'gift-fresh-free-700': {
      name: 'عرض ال700 - علبة فريش جوسي والثانية هدية',
      image: 'photo_6032724400295055833_y%20%281%29.jpg',
      options: [
        { id: 'fresh-plus-gift', label: 'علبتان فريش جوسي، واحدة هدية', price: 700, weightGrams: 1600 }
      ],
      category: 'العروض',
      categoryUrl: 'offers.html',
      weight: '1.6 كجم',
      description: 'علبتان من مجدول فريش جوسي، والثانية هدية.'
    },
    'siwi-premium': {
      name: 'تمر سيوي درجة اولى',
      image: 'photo_6046412473952309923_y.jpg',
      images: ['photo_6046412473952309923_y.jpg', 'photo_6046412473952309922_y.jpg'],
      options: [
        { id: '5kg', label: '5كج', price: 350, weightGrams: 5000 },
        { id: '3kg', label: '3كج', price: 210, weightGrams: 3000 },
        { id: '1400g', label: '1400 جم', price: 100, weightGrams: 1400 },
        { id: '700g', label: '700جم', price: 60, weightGrams: 700 }
      ],
      category: 'التمر السيوي',
      categoryUrl: 'siwi-dates.html',
      weight: 'اختر العبوة',
      description: 'تمر سيوي درجة أولى مختار بعناية، من محصول مصري بطعمه الطبيعي.'
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = productCatalog;
  if (global) global.productCatalog = productCatalog;
})(typeof window === 'undefined' ? null : window);
