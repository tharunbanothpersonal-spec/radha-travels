// data/services.js

export const SEGMENTS = [
  {
    id: "hatchback",
    label: "Hatchback",
    desc: "Compact, easy to maneuver, perfect for city trips.",
    cars: [
      { name: "Maruti Suzuki Swift", img: "/images/fleet/hatchback/swift.png" },
      { name: "Tata Tiago",           img: "/images/fleet/hatchback/tiago.png" },
      { name: "Maruti Suzuki Baleno", img: "/images/fleet/hatchback/baleno.png" },
      { name: "Hyundai i20",          img: "/images/fleet/hatchback/i20.png" }
    ],
    pricing: {
      local:      { pack: "8Hrs / 80KM", base: 1699, extra_km: 12,  extra_hr: 150, driver: 0 },
      outstation: { per_km: 12.5,  min_km_day: 300, driver: 300, night: 300 },
      airport:    { pickup: 899, drop: 899, waiting_per_hr: 150 },
      corporate:  { monthly: "On Request", gst: "18%" },
      custom:     { note: "Tailored itinerary & hours. Get a quick estimate." }
    }
  },
  {
    id: "sedan",
    label: "Sedan",
    desc: "Comfortable family sedan with separate boot.",
    cars: [
      { name: "Honda City",        img: "/images/fleet/sedan/city.png" },
      { name: "Hyundai Verna",     img: "/images/fleet/sedan/verna.png" },
      { name: "Skoda Slavia",      img: "/images/fleet/sedan/slavia.png" },
      { name: "Volkswagen Virtus", img: "/images/fleet/sedan/virtus.png" }
    ],
    pricing: {
      local:      { pack: "8Hrs / 80KM", base: 2199, extra_km: 14,  extra_hr: 200, driver: 0 },
      outstation: { per_km: 14.5,  min_km_day: 300, driver: 300, night: 300 },
      airport:    { pickup: 1199, drop: 1199, waiting_per_hr: 200 },
      corporate:  { monthly: "On Request", gst: "18%" },
      custom:     { note: "Tailored itinerary & hours. Get a quick estimate." }
    }
  },
  {
    id: "prime-sedan",
    label: "Prime Sedan",
    desc: "Premium trims for executive comfort and features.",
    cars: [
      { name: "Honda City ZX",        img: "/images/fleet/prime-sedan/city.png" },
      { name: "Hyundai Verna SX(O)",  img: "/images/fleet/prime-sedan/verna.png" },
      { name: "Maruti Suzuki Ciaz",   img: "/images/fleet/prime-sedan/ciaz.png" }
    ],
    pricing: {
      local:      { pack: "8Hrs / 80KM", base: 2599, extra_km: 16,  extra_hr: 250, driver: 0 },
      outstation: { per_km: 16.5,  min_km_day: 300, driver: 300, night: 300 },
      airport:    { pickup: 1499, drop: 1499, waiting_per_hr: 250 },
      corporate:  { monthly: "On Request", gst: "18%" },
      custom:     { note: "Tailored itinerary & hours. Get a quick estimate." }
    }
  },
  {
    id: "suv",
    label: "SUV",
    desc: "Higher ground clearance—great for rough roads & long trips.",
    cars: [
      { name: "Hyundai Creta",          img: "/images/fleet/suv/creta.png" },
      { name: "Kia Seltos",             img: "/images/fleet/suv/seltos.png" },
      { name: "Maruti Suzuki Brezza",   img: "/images/fleet/suv/brezza.png" },
      { name: "Maruti Ertiga",          img: "/images/fleet/suv/ertiga.png" }
    ],
    pricing: {
      local:      { pack: "8Hrs / 80KM", base: 2799, extra_km: 18,  extra_hr: 300, driver: 0 },
      outstation: { per_km: 17.5,  min_km_day: 300, driver: 300, night: 300 },
      airport:    { pickup: 1599, drop: 1599, waiting_per_hr: 300 },
      corporate:  { monthly: "On Request", gst: "18%" },
      custom:     { note: "Tailored itinerary & hours. Get a quick estimate." }
    }
  },
  {
    id: "prime-suv",
    label: "Prime SUV",
    desc: "Spacious & luxurious SUVs with advanced features.",
    cars: [
      { name: "Toyota Innova Hycross", img: "/images/fleet/prime-suv/hycross.png" },
      { name: "Toyota Innova Crysta",  img: "/images/fleet/prime-suv/crysta.png" },
      { name: "Toyota Fortuner",       img: "/images/fleet/prime-suv/fortuner.png" },
      { name: "Kia Carens",            img: "/images/fleet/prime-suv/carens.png" }
    ],
    pricing: {
      local:      { pack: "8Hrs / 80KM", base: 3599, extra_km: 22,  extra_hr: 400, driver: 0 },
      outstation: { per_km: 22.5,  min_km_day: 300, driver: 400, night: 400 },
      airport:    { pickup: 1999, drop: 1999, waiting_per_hr: 350 },
      corporate:  { monthly: "On Request", gst: "18%" },
      custom:     { note: "Tailored itinerary & hours. Get a quick estimate." }
    }
  }
];

// data/services.js
export const SERVICES = [
  {
    id: 'local-tour',
    slug: 'local-tour',
    title: 'Local Tour',
    icon: 'ri-map-pin-2-line',
    blurb: '8hr / 80km packages inside the city.',
    image: 'local.jpg',
    // NEW
    details: {
      intro:
        'Perfect for city commutes, errands, and local sight-seeing. Choose 8hr/80km or 12hr/120km packages. Extra hours & kms charged transparently.',
      routes: [
        { from: 'Majestic', to: 'MG Road', km: 6, time: '25m' },
        { from: 'Indiranagar', to: 'Whitefield', km: 16, time: '45m' },
        { from: 'JP Nagar', to: 'Electronic City', km: 12, time: '35m' },
      ],
    },
  },
  {
    id: 'outstation',
    slug: 'outstation',
    title: 'Outstation',
    icon: 'ri-route-line',
    blurb: 'Per-km billing with flexible days.',
    image: 'outstation.jpg',
    // NEW
    details: {
      intro:
        'Clean cars and courteous chauffeurs for your outstation journeys. Transparent per-km pricing, minimum kms/day and driver/night charges as applicable.',
      routes: [
        { from: 'Bengaluru', to: 'Mysuru', km: 150, time: '3h 30m' },
        { from: 'Bengaluru', to: 'Coorg', km: 260, time: '6h' },
        { from: 'Bengaluru', to: 'Ooty', km: 270, time: '6h 30m' },
        { from: 'Bengaluru', to: 'Tirupati', km: 250, time: '5h 30m' },
      ],
    },
  },
  {
    id: 'airport-transfer',
    slug: 'airport-transfer',
    title: 'Airport Transfer',
    icon: 'ri-plane-line',
    blurb: 'On-time pickups & drops, 24×7.',
    image: 'airport.jpg',
    // NEW
    details: {
      intro:
        '24×7 on-time airport pickups & drops with live flight tracking, meet & greet on request and zero surprise charges.',
      routes: [
        { from: 'BLR (KIA)', to: 'MG Road', km: 36, time: '1h' },
        { from: 'BLR (KIA)', to: 'Electronic City', km: 54, time: '1h 30m' },
        { from: 'BLR (KIA)', to: 'Whitefield', km: 42, time: '1h 10m' },
      ],
    },
  },
  {
    id: 'corporate',
    slug: 'corporate',
    title: 'Corporate Bookings',
    icon: 'ri-building-2-line',
    blurb: 'Dedicated chauffeurs & monthly invoicing.',
    image: 'corporate.jpg',
    // NEW
    details: {
      intro:
        'Chauffeur-drive solutions for teams and guests — dedicated cars, SLAs, consolidated billing and support.',
      routes: [
        { from: 'Hotel Cluster', to: 'Office Campus', km: 8, time: '30m' },
        { from: 'Airport', to: 'Office Campus', km: 40, time: '1h 10m' },
      ],
    },
  },
  {
    id: 'custom',
    slug: 'custom',
    title: 'Custom Bookings',
    icon: 'ri-sparkling-2-line',
    blurb: 'Design your trip your way.',
    image: 'custom.jpg',
    details: {
      intro:
        'Tell us your plan — multiple stops, multi-day itineraries, events or out-of-city transfers. We’ll tailor it.',
      routes: [],
    },
  },
];
