(function setNajmaShipping(global) {
  const regions = {
    cairo_giza: { label: 'القاهرة والجيزة', baseFee: 75 },
    delta_canal: { label: 'الدلتا ومدن القناة', baseFee: 100 },
    border_areas: { label: 'المناطق الحدودية (البحر الأحمر والساحل الشمالي والوادي الجديد ومرسى مطروح)', baseFee: 150 },
    upper_egypt: { label: 'الصعيد', baseFee: 110 },
    sinai_arish: { label: 'سيناء والعريش', baseFee: 170 }
  };

  function calculateShipping(region, weightGrams, subtotal = 0) {
    const selectedRegion = regions[region];
    if (!Number.isInteger(weightGrams) || weightGrams < 1
      || !Number.isFinite(subtotal) || subtotal < 0) return null;
    if (subtotal > 2000) return 0;
    if (!selectedRegion) return null;
    const extraWeightFee = Math.ceil(Math.max(0, weightGrams - 2000) / 2000) * 10;
    const fee = selectedRegion.baseFee + extraWeightFee;
    return region === 'cairo_giza' ? Math.min(fee, 115) : fee;
  }

  const shipping = { regions, calculateShipping };
  if (typeof module !== 'undefined' && module.exports) module.exports = shipping;
  if (global) global.najmaShipping = shipping;
})(typeof window === 'undefined' ? null : window);
