export function validateCandle(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Anteckningen saknas.');
  const text = (key, max, required = true) => {
    if (typeof value[key] !== 'string') throw new Error('Kontrollera uppgifterna i formuläret.');
    const result = value[key].trim();
    if ((required && !result) || result.length > max) throw new Error('Fyll i de obligatoriska fälten och kontrollera textlängden.');
    return result;
  };
  const person = text('person', 100), place = text('place', 160), date = text('date', 10);
  const message = text('message', 2000, false), authorName = text('authorName', 80);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw new Error('Välj ett giltigt datum.');
  const latitude = value.latitude, longitude = value.longitude;
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw new Error('Välj en giltig plats på kartan.');
  return { person, place, date, message, authorName, latitude, longitude };
}

export function validOrigin(request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}
