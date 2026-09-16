export const PROMOTR_VENUE_FACTS_VERSION = "promotr-venue-facts.v2";

export const promotrVenueFacts = {
  name: "The Promotr Lounge",
  conciergeName: "Vera",
  address: "123 King Street West, Toronto, Ontario",
  timezone: "America/Toronto",
  minimumAge: 19,
  identification:
    "Valid government-issued photo ID is required. No exceptions.",
  hours: {
    thursday: "10:00 PM-3:00 AM",
    friday: "10:00 PM-3:00 AM",
    saturday: "10:00 PM-3:00 AM",
    sundayToWednesday: "Closed unless a special event is confirmed",
  },
  entry: {
    generalCoverCad: 20,
    admissionGuaranteed: false,
    subjectToCapacityAndDoorPolicies: true,
  },
  guestList: {
    coverCad: 0,
    condition: "Every guest in the party must arrive before 11:00 PM",
    placementGuaranteedOnlyBySystem: true,
    admissionGuaranteed: false,
  },
  tables: {
    highTop: { minimumSpendCad: 500, includedEntryUpTo: 5 },
    booth: { minimumSpendCad: 1500, includedEntryUpTo: 10 },
    guidance: {
      upToFiveGuests: "High top",
      sixToTenGuests: "Booth",
      largerGroups:
        "Depends on capacity and availability; staff review is required",
    },
    minimumAppliesToTable: true,
    liveAvailabilityKnown: false,
  },
  music: [
    "Hip-hop",
    "R&B",
    "Afrobeats",
    "house",
    "Top 40",
    "club hits",
    "party anthems",
  ],
  dressCode: {
    recommendation: "Upscale and stylish",
    cleanStylishSneakers: "May be accepted depending on the full outfit",
    hats: "Discouraged",
    notAllowed: [
      "sports jerseys",
      "sweatpants",
      "baggy clothing",
      "beachwear",
      "work boots",
      "dirty or worn sneakers",
    ],
    finalDiscretion: "Venue security and management",
  },
  celebrations: {
    cakesAllowed: true,
    complimentaryExtrasGuaranteed: false,
  },
  service: {
    bottleService: "Available through a table reservation",
    fullBar: true,
    foodAvailable: true,
  },
  transport: {
    dedicatedParkingClaimed: false,
    guidance: ["Nearby paid parking", "TTC", "Uber", "Lyft", "taxi", "walking"],
  },
  walkIns: "Allowed, subject to capacity and door policies",
  reservationFields: [
    "date",
    "guest count",
    "preferred table",
    "guest name",
    "arrival time",
    "occasion",
  ],
  vipMeaning: "Table service",
  neverInvent: [
    "live availability",
    "DJs, artists, events, celebrities, or promotions",
    "bottle brands or bottle prices",
    "drink or food prices",
    "discounts or complimentary extras",
    "refund or cancellation outcomes",
    "accessibility, lost-and-found, or security details not provided",
  ],
} as const;
