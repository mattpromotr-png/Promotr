insert into public.venues (slug, name, timezone, booking_form_url, venue_facts, ai_configuration)
values (
  'promotr-nightclub',
  'The Promotr Lounge',
  'America/Toronto',
  'http://localhost:3000/book',
  '{"factsVersion":"promotr-venue-facts.v2","name":"The Promotr Lounge","address":"123 King Street West, Toronto, Ontario","minimumAge":19,"identification":"Valid government-issued photo ID is required. No exceptions.","hours":{"thursday":"10:00 PM-3:00 AM","friday":"10:00 PM-3:00 AM","saturday":"10:00 PM-3:00 AM","sundayToWednesday":"Closed unless a special event is confirmed"},"entry":{"generalCoverCad":20,"admissionGuaranteed":false},"guestList":{"coverCad":0,"condition":"Every guest in the party must arrive before 11:00 PM","admissionGuaranteed":false},"tables":{"highTop":{"minimumSpendCad":500,"includedEntryUpTo":5},"booth":{"minimumSpendCad":1500,"includedEntryUpTo":10},"liveAvailabilityKnown":false},"music":["Hip-hop","R&B","Afrobeats","house","Top 40","club hits","party anthems"],"dressCode":{"recommendation":"Upscale and stylish","cleanStylishSneakers":"May be accepted depending on the full outfit","hats":"Discouraged","notAllowed":["sports jerseys","sweatpants","baggy clothing","beachwear","work boots","dirty or worn sneakers"],"finalDiscretion":"Venue security and management"},"celebrations":{"cakesAllowed":true,"complimentaryExtrasGuaranteed":false},"service":{"bottleService":"Available through a table reservation","fullBar":true,"foodAvailable":true},"transport":{"dedicatedParkingClaimed":false,"guidance":["Nearby paid parking","TTC","Uber","Lyft","taxi","walking"]},"walkIns":"Allowed, subject to capacity and door policies","vipMeaning":"Table service"}'::jsonb,
  '{"promptVersion":"vera.v2","maxRecentMessages":8,"maxOutputTokens":300,"maxQuestionsPerReply":1}'::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  timezone = excluded.timezone,
  booking_form_url = excluded.booking_form_url,
  venue_facts = excluded.venue_facts,
  ai_configuration = excluded.ai_configuration,
  updated_at = now();
