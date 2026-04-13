// data/services.js

export const SEGMENTS = [
  {
    id: "hatchback",
    label: "Hatchback",
    desc: "Compact, easy to maneuver, perfect for city trips.",
    cars: [
      { name: "Maruti Suzuki Swift", img: "/images/fleet/hatchback/swift.webp" },
      { name: "Tata Tiago",           img: "/images/fleet/hatchback/tiago.webp" },
      { name: "Maruti Suzuki Baleno", img: "/images/fleet/hatchback/baleno.webp" },
      { name: "Hyundai i20",          img: "/images/fleet/hatchback/i20.webp" }
    ],
    pricing: {
      local:      { pack: "8Hrs / 80KM", base: 2200, extra_km: 12,  extra_hr: 150, driver: 0 },
      outstation: { per_km: 14,  min_km_day: 300, driver: 300, night: 300 },
      airport:    { pickup: 1200, drop: 1200, waiting_per_hr: 150 },
      corporate:  { monthly: "On Request", gst: "18%" },
      custom:     { note: "Tailored itinerary & hours. Get a quick estimate." }
    }
  },
  {
    id: "sedan",
    label: "Sedan",
    desc: "Comfortable family sedan with separate boot.",
    cars: [
      { name: "Honda City",        img: "/images/fleet/sedan/city.webp" },
      { name: "Hyundai Verna",     img: "/images/fleet/sedan/verna.webp" },
      { name: "Skoda Slavia",      img: "/images/fleet/sedan/slavia.webp" },
      { name: "Volkswagen Virtus", img: "/images/fleet/sedan/virtus.webp" }
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
    id: "premium-sedan",
    label: "premium Sedan",
    desc: "Premium trims for executive comfort and features.",
    cars: [
      { name: "Honda City ZX",        img: "/images/fleet/prime-sedan/city.webp" },
      { name: "Hyundai Verna SX(O)",  img: "/images/fleet/prime-sedan/verna.webp" },
      { name: "Maruti Suzuki Ciaz",   img: "/images/fleet/prime-sedan/ciaz.webp" }
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
      { name: "Hyundai Creta",          img: "/images/fleet/suv/creta.webp" },
      { name: "Kia Seltos",             img: "/images/fleet/suv/seltos.webp" },
      { name: "Maruti Suzuki Brezza",   img: "/images/fleet/suv/brezza.webp" },
      { name: "Maruti Ertiga",          img: "/images/fleet/suv/ertiga.webp" }
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
    id: "premium-suv",
    label: "premium SUV",
    desc: "Spacious & luxurious SUVs with advanced features.",
    cars: [
      { name: "Toyota Innova Hycross", img: "/images/fleet/prime-suv/hycross.webp" },
      { name: "Toyota Innova Crysta",  img: "/images/fleet/prime-suv/crysta.webp" },
      { name: "Toyota Fortuner",       img: "/images/fleet/prime-suv/fortuner.webp" },
      { name: "Kia Carens",            img: "/images/fleet/prime-suv/carens.webp" }
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
    seo: {
      metaTitle: 'Local Sightseeing Cabs in Hyderabad | 8Hr/80Km Packages | Radha Travels',
      metaDescription: 'Book premium local cabs in Hyderabad for city commutes, shopping, and heritage tours. Choose flexible 8hr/80km or 12hr/120km packages with verified drivers.'
    },
    details: {
      intro: 'Perfect for city commutes, heritage sight-seeing, and shopping trips. Choose standard 8hr/80km or 12hr/120km packages. Extra hours & kms are charged transparently.',
      highlights: [
        'City-Savvy Local Chauffeurs',
        'Flexible 8Hr or 12Hr Packages',
        'Multiple Pickups & Drops Allowed',
        'Immaculately Clean AC Vehicles'
      ],
      terms: {
        included: ['Fuel charges', 'Chauffeur services', 'Vehicle AC', 'Base kilometers & hours limit'],
        excluded: ['Parking charges', 'Toll taxes (if crossing ORR/city limits)', 'Extra km/hr charges beyond package']
      },
      routes: [
        { from: 'Secunderabad', to: 'Hi-Tech City', km: 18, time: '45m' },
        { from: 'Charminar', to: 'Banjara Hills', km: 10, time: '30m' },
        { from: 'LB Nagar', to: 'Gachibowli', km: 26, time: '55m' },
      ],
      faqs: [
        {
          question: 'What happens if I exceed the 80km or 8-hour limit?',
          answer: 'Any additional usage beyond the selected package limit is billed at a fixed, transparent rate per extra kilometer or extra hour, depending on the vehicle segment.'
        },
        {
          question: 'Can I change my drop location during the trip?',
          answer: 'Yes! Our local packages are highly flexible. You can make multiple stops and change your route within the city limits as long as it fits your package time and distance.'
        }
      ]
    },
  },
  {
    id: 'outstation',
    slug: 'outstation',
    title: 'Outstation',
    icon: 'ri-route-line',
    blurb: 'Per-km billing with flexible days.',
    image: 'outstation.jpg',
    seo: {
      metaTitle: 'Outstation Cabs in Hyderabad | Premium Intercity Taxi | Radha Travels',
      metaDescription: 'Book premium outstation cabs from Hyderabad to Srisailam, Vijayawada, and Tirupati. Transparent per-km pricing with verified, courteous chauffeurs.'
    },
    details: {
      intro: 'Clean cars and courteous chauffeurs for your outstation journeys. Transparent per-km pricing, minimum kms/day, and driver allowances as applicable.',
      highlights: [
        'Doorstep Pickup & Drop',
        'Highway-Experienced Chauffeurs',
        '24/7 Roadside Assistance',
        'Zero Hidden Charges'
      ],
      terms: {
        included: ['Fuel charges', 'Driver allowance (Day)', 'Vehicle AC'],
        excluded: ['Toll taxes & FASTag deductions', 'Inter-state permit taxes', 'Night driving allowance (10 PM - 6 AM)', 'Parking fees']
      },
      routes: [
        { from: 'Hyderabad', to: 'Srisailam', km: 215, time: '4h 30m' },
        { from: 'Hyderabad', to: 'Vijayawada', km: 275, time: '5h' },
        { from: 'Hyderabad', to: 'Warangal', km: 150, time: '3h' },
        { from: 'Hyderabad', to: 'Tirupati', km: 550, time: '10h' },
      ],
      faqs: [
        {
          question: 'How is the outstation billing calculated?',
          answer: 'Billing is calculated based on the total kilometers traveled from garage to garage, subject to a minimum of 250 km or 300 km per day depending on the vehicle segment.'
        },
        {
          question: 'Do I need to pay for the driver’s food and accommodation?',
          answer: 'A standard daily driver allowance (Batta) is added to your bill to cover their food. Accommodation is usually managed by the driver, though providing a basic arrangement at remote locations is appreciated.'
        }
      ]
    },
  },
  {
    id: 'airport-transfer',
    slug: 'airport-transfer',
    title: 'Airport Transfer',
    icon: 'ri-plane-line',
    blurb: 'On-time pickups & drops, 24×7.',
    image: 'airport.jpg',
    seo: {
      metaTitle: 'Hyderabad Airport Taxi | 24/7 RGIA Pickups & Drops | Radha Travels',
      metaDescription: 'Reliable Rajiv Gandhi International Airport (RGIA) transfers. Enjoy on-time pickups, flight tracking, and comfortable AC cabs. Book your Hyderabad airport taxi today.'
    },
    details: {
      intro: '24×7 on-time airport pickups & drops to Rajiv Gandhi International Airport (RGIA) with live flight tracking, meet & greet on request, and zero surprise charges.',
      highlights: [
        'Live Flight Tracking',
        '24/7 Airport Availability',
        'No Night-Time Surcharges',
        'Spacious Trunks for Luggage'
      ],
      terms: {
        included: ['Fuel charges', 'Chauffeur services', 'Vehicle AC', 'Standard wait time (45 mins for pickups)'],
        excluded: ['Airport parking fees (if applicable)', 'PVNR Expressway / ORR Tolls', 'Extra drop points']
      },
      routes: [
        { from: 'HYD (RGIA)', to: 'Banjara Hills', km: 30, time: '45m' },
        { from: 'HYD (RGIA)', to: 'Hi-Tech City', km: 35, time: '50m' },
        { from: 'HYD (RGIA)', to: 'Secunderabad', km: 38, time: '1h' },
      ],
      faqs: [
        {
          question: 'What if my flight is delayed?',
          answer: 'We track your flight status in real-time. Your driver will adjust their arrival time accordingly, so you won’t be charged extra waiting fees for standard airline delays.'
        },
        {
          question: 'Where will the driver meet me at the airport?',
          answer: 'Your driver will coordinate with you via phone and wait at the designated Arrivals pickup zone at RGIA. Meet & Greet service with a placard is also available upon request.'
        }
      ]
    },
  },
  {
    id: 'corporate',
    slug: 'corporate',
    title: 'Corporate Bookings',
    icon: 'ri-building-2-line',
    blurb: 'Dedicated chauffeurs & monthly invoicing.',
    image: 'corporate.jpg',
    seo: {
      metaTitle: 'Corporate Car Rental Hyderabad | Executive Cabs | Radha Travels',
      metaDescription: 'Premium chauffeur-driven solutions for Hyderabad businesses. Enjoy dedicated fleets, SLA compliance, GST invoicing, and priority 24/7 support.'
    },
    details: {
      intro: 'Chauffeur-driven solutions for teams and corporate guests — dedicated cars, SLAs, consolidated monthly billing, and priority support.',
      highlights: [
        'GST Compliant Monthly Invoicing',
        'Dedicated Account Manager',
        'Strict SLA & Safety Compliance',
        'Executive & Luxury Fleet Availability'
      ],
      terms: {
        included: ['Fuel and Chauffeur', 'Daily vehicle sanitization', 'Customized monthly SLA terms'],
        excluded: ['Outstation state taxes', 'Unplanned parking fees']
      },
      routes: [
        { from: 'Banjara Hills Hotels', to: 'Financial District', km: 14, time: '35m' },
        { from: 'HYD Airport', to: 'Raheja Mindspace', km: 36, time: '50m' },
      ],
      faqs: [
        {
          question: 'Do you offer monthly post-paid billing?',
          answer: 'Yes, we offer customized monthly invoicing cycles with detailed trip logs for verified corporate accounts.'
        },
        {
          question: 'Can we request a specific type of vehicle for VIP guests?',
          answer: 'Absolutely. We maintain a fleet of premium sedans and luxury SUVs specifically reserved for executive and VIP corporate transfers.'
        }
      ]
    },
  },
  {
    id: 'custom',
    slug: 'custom',
    title: 'Custom Bookings',
    icon: 'ri-sparkling-2-line',
    blurb: 'Design your trip your way.',
    image: 'custom.jpg',
    seo: {
      metaTitle: 'Custom Taxi Packages Hyderabad | Wedding & Event Cabs | Radha Travels',
      metaDescription: 'Tailor-made cab packages for weddings, events, and multi-day tours in Hyderabad. Tell us your itinerary and we will design the perfect travel solution.'
    },
    details: {
      intro: 'Tell us your plan — multiple stops, multi-day itineraries, wedding events, or special out-of-city transfers. We’ll tailor a package perfectly for you.',
      highlights: [
        'Complete Itinerary Freedom',
        'Bulk Fleet Booking for Weddings',
        'Multi-Day Trip Coordination',
        'Personalized Pricing Quotes'
      ],
      terms: {
        included: ['As per your customized quotation'],
        excluded: ['As per your customized quotation']
      },
      routes: [],
      faqs: [
        {
          question: 'How do I get a quote for a custom itinerary?',
          answer: 'Simply click the "WhatsApp Quote" button on this page, or call our support line. Share your dates, destinations, and passenger count, and we will provide a custom tariff.'
        },
        {
          question: 'Can I book multiple vehicles for a wedding or family event?',
          answer: 'Yes! We frequently handle bulk bookings for weddings and events. We can provide a mix of SUVs, sedans, and Tempo Travellers to suit your guest list.'
        }
      ]
    },
  },
];
