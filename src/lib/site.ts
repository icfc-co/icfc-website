// Contact details and links shared by the header, footer and home page.

export const SITE = {
  name: 'Islamic Center of Fort Collins',
  short: 'ICFC',
  phone: '+1 (970) 221-2425',
  phoneHref: 'tel:+19702212425',
  email: 'info@icfc.org',
  address: '925 West Lake Street',
  cityLine: 'Fort Collins, CO 80521',
};

const mapsQuery = encodeURIComponent(`${SITE.name}, 925 W Lake St, Fort Collins, CO 80521`);

export const MAPS = {
  // Opens directions in Google Maps (app on phones)
  directions: `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`,
  embed: `https://maps.google.com/maps?q=${mapsQuery}&z=15&output=embed`,
};

export const SOCIAL = [
  { name: 'Instagram', href: 'https://www.instagram.com/islamic_center_of_fort_collins/' },
  { name: 'Facebook', href: 'https://www.facebook.com/icfcco/' },
  { name: 'YouTube', href: 'https://www.youtube.com/@icfcco' },
] as const;
