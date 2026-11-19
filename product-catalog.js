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
        { label: '١ كجم — لارج', legacyLabels: ['لارج'], price: 350, weightGrams: 1000 },
        { label: '١ كجم — جامبو', legacyLabels: ['جامبو'], price: 450, weightGrams: 1000 },
        {
          label: 'عروض',
          isOfferGroup: true,
          children: [
            {
              id: 'family-large',
              isOffer: true,
              label: 'عرض العيلة (3 عبوات لارج = 3 كجم)',
              price: 1000,
              weightGrams: 3000,
              content: 'بـ 1000 جنيه بدلاً من 1050 جنيه'
            },
            {
              id: 'family-jumbo',
              isOffer: true,
              label: 'عرض العيلة (3 عبوات جامبو = 3 كجم)',
              price: 1250,
              weightGrams: 3000,
              content: 'بـ 1250 جنيه بدلاً من 1350 جنيه. (يبقى وفرت حوالى 200 جنيه)'
            }
          ]
        }
      ],
      category: 'تمور المجدول',
      categoryUrl: 'majdool-dates.html',
      weight: 'اختاروا العبوة',
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
        { label: '800 جم', price: 400, weightGrams: 800 },
        {
          id: 'jumbo-saver',
          isOffer: true,
          label: 'عرض التوفير (3 عبوات = 2.4 كجم)',
          price: 1150,
          weightGrams: 2400,
          content: 'بـ 1150 جنيه بدلا من 1200 جنيه'
        }
      ],
      category: 'تمور المجدول',
      categoryUrl: 'majdool-dates.html',
      weight: '٨٠٠ جم',
      description: 'حبات مجدول جامبو طرية وغنية، مناسبة للمشاركة والاستمتاع بها في أي وقت.'
    },
    'siwi-premium': {
      name: 'تمر سيوي درجة اولى',
      image: 'photo_6046412473952309923_y.jpg',
      images: ['photo_6046412473952309923_y.jpg', 'photo_6046412473952309922_y.jpg'],
      options: [
        { label: '5كج', price: 350, weightGrams: 5000 },
        { label: '3كج', price: 210, weightGrams: 3000 },
        { label: '1400 جم', price: 100, weightGrams: 1400 },
        { label: '700جم', price: 60, weightGrams: 700 }
      ],
      category: 'التمر السيوي',
      categoryUrl: 'siwi-dates.html',
      weight: 'اختاروا العبوة',
      description: 'تمر سيوي درجة أولى مختار بعناية، من محصول مصري بطعمه الطبيعي.'
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = productCatalog;
  if (global) global.productCatalog = productCatalog;
})(typeof window === 'undefined' ? null : window);
