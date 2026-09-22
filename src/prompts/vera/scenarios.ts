import { accessibilityPlaybook } from "./scenarios/accessibility";
import { admissionGuestListPlaybook } from "./scenarios/admission-guest-list";
import { ageIdPlaybook } from "./scenarios/age-id";
import { barFoodPlaybook } from "./scenarios/bar-food";
import { bottleServicePlaybook } from "./scenarios/bottle-service";
import { celebrationsPlaybook } from "./scenarios/celebrations";
import { complaintsPlaybook } from "./scenarios/complaints";
import { discountsPlaybook } from "./scenarios/discounts";
import { dressCodePlaybook } from "./scenarios/dress-code";
import { generalNightlifePlaybook } from "./scenarios/general-nightlife";
import { identitySocialPlaybook } from "./scenarios/identity-social";
import { lostFoundPlaybook } from "./scenarios/lost-found";
import { musicEventsPlaybook } from "./scenarios/music-events";
import { nearbyPlaybook } from "./scenarios/nearby";
import { offTopicPlaybook } from "./scenarios/off-topic";
import { openingPlaybook } from "./scenarios/opening";
import { photosPlaybook } from "./scenarios/photos";
import { privateEventsPlaybook } from "./scenarios/private-events";
import { refundsCancellationsPlaybook } from "./scenarios/refunds-cancellations";
import { safetyPlaybook } from "./scenarios/safety";
import { staffPrivacyPlaybook } from "./scenarios/staff-privacy";
import { tablesReservationsPlaybook } from "./scenarios/tables-reservations";
import { torontoSlangPlaybook } from "./scenarios/toronto-slang";
import { transportPlaybook } from "./scenarios/transport";
import { venueBasicsPlaybook } from "./scenarios/venue-basics";

export const veraScenarioPlaybooks = {
  opening: openingPlaybook,
  venue_basics: venueBasicsPlaybook,
  age_id: ageIdPlaybook,
  entry_guest_list: admissionGuestListPlaybook,
  tables_reservations: tablesReservationsPlaybook,
  dress_code: dressCodePlaybook,
  celebrations: celebrationsPlaybook,
  music_events: musicEventsPlaybook,
  bottle_menu: bottleServicePlaybook,
  bar_food: barFoodPlaybook,
  transport: transportPlaybook,
  nearby_recommendations: nearbyPlaybook,
  photos: photosPlaybook,
  private_events: privateEventsPlaybook,
  lost_and_found: lostFoundPlaybook,
  safety_handoff: safetyPlaybook,
  staff_privacy: staffPrivacyPlaybook,
  complaints: complaintsPlaybook,
  refunds_cancellations: refundsCancellationsPlaybook,
  accessibility: accessibilityPlaybook,
  discounts: discountsPlaybook,
  identity_social: identitySocialPlaybook,
  toronto_slang: torontoSlangPlaybook,
  general_nightlife: generalNightlifePlaybook,
  off_topic: offTopicPlaybook,
} as const;

export const VERA_SCENARIO_IDS = Object.keys(veraScenarioPlaybooks) as Array<
  keyof typeof veraScenarioPlaybooks
>;

export type VeraScenarioId = keyof typeof veraScenarioPlaybooks;
