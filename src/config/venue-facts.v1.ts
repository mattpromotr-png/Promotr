export const PROMOTR_VENUE_FACTS_VERSION = "promotr-venue-facts.v1";

export const promotrVenueFacts = {
  name: "Promotr Nightclub",
  location: "Downtown Toronto",
  minimumAge: 19,
  capacityApproximate: 500,
  hours: {
    friday: "10:00 PM–3:00 AM",
    saturday: "10:00 PM–3:00 AM",
  },
  music: ["Hip-hop", "R&B", "Afrobeats", "Top 40", "party anthems"],
  entry: {
    before11Pm: { amount: 20, currency: "CAD" },
    after11Pm: { amount: 30, currency: "CAD" },
    mayVaryForSpecialEvents: true,
    admissionGuaranteed: false,
  },
  guestList: {
    availability: "select nights",
    recommendedArrival: "before 11:00 PM",
    immediateEntryGuaranteed: false,
    largeGroupsShouldArriveEarlier: true,
  },
  arrivalGuidance: [
    {
      window: "10:30–11:30 PM",
      description: "easier entry and a good atmosphere",
    },
    {
      window: "11:30 PM–12:30 AM",
      description: "busiest period and peak energy",
    },
    { window: "after midnight", description: "packed, high-energy atmosphere" },
  ],
  dressCode: {
    recommendation: "Dress to impress; upscale nightlife attire",
    notAllowed: [
      "sweatpants",
      "athletic wear",
      "jerseys",
      "beachwear",
      "excessively baggy clothing",
      "dirty or ripped clothing",
    ],
    cleanSneakers: "may be permitted depending on the night",
    finalDiscretion: "management and security",
  },
  bottleService: {
    currency: "CAD",
    startingPrices: {
      standardVodka: 350,
      premiumVodka: 450,
      tequila: 400,
      premiumTequila: 500,
      champagne: 400,
      premiumChampagne: 600,
    },
    generallyIncludes: [
      "reserved table",
      "dedicated server",
      "bottle selection",
      "mixers",
      "priority entry",
    ],
    pricesMayVaryBy: [
      "date",
      "bottle selection",
      "group size",
      "special event",
    ],
  },
  unavailableFacts: [
    "exact street address",
    "live availability",
    "special-event schedule",
  ],
} as const;
