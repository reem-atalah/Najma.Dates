(function setProductCatalog(global) {
  const productCatalog = {
    'majdool-premium': {
      name: 'مجدول بريميوم 1كج',
      image: 'WhatsApp%20Image%202026-11-09%20at%203.25.56%20AM.jpeg',
      options: [
        { label: 'لارج', price: 350 },
        { label: 'جامبو', price: 450 },
        {
          label: 'عروض',
          children: [
            {
              label: 'عرض العيلة (3 عبوات لارج = 3 كجم)',
              price: 1000,
              content: 'بـ 1000 جنيه بدلاً من 1050 جنيه + شحن مجاني تماماً'
            },
            {
              label: 'عرض العيلة (3 عبوات جامبو = 3 كجم)',
              price: 1250,
              content: 'بـ 1250 جنيه بدلاً من 1350 جنيه + شحن مجاني. (يبقى وفرت حوالى 200 جنيه)'
            }
          ]
        }
      ],
      category: 'تمور المجدول',
      categoryUrl: 'majdool-dates.html',
      weight: '١ كجم',
      description: 'تمر مجدول بريميوم مختار بعناية، بطعمه الغني وقوامه الطري.'
    },
    'majdool-jumbo': {
      name: 'مجدول جوسي جامبو 800 جم',
      image: 'WhatsApp%20Imag%202026-11-09%20at%203.25.56%20AM.jpeg',
      options: [
        { label: '800 جم', price: 400 },
        {
          label: 'عرض التوفير (3 عبوات = 2.4 كجم)',
          price: 1150,
          content: 'بـ 1150 جنيه بدلا من 1200 جنيه + شحن مجاني تماماً'
        }
      ],
      category: 'تمور المجدول',
      categoryUrl: 'majdool-dates.html',
      weight: '٨٠٠ جم',
      description: 'حبات مجدول جامبو طرية وغنية، مناسبة للمشاركة والاستمتاع بها في أي وقت.'
    },
    'siwi-premium': {
      name: 'تمر سيوي درجة اولى',
      image: 'WhtsApp%20Image%202026-11-09%20at%203.30.53%20AM.jpeg',
      options: [
        { label: '5كج', price: 350 },
        { label: '3كج', price: 210 },
        { label: '1400 جم', price: 100 },
        { label: '700جم', price: 60 }
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
