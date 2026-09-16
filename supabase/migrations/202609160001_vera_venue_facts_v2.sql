-- Align database-backed messaging with the newer client-approved Vera facts.
-- This changes venue configuration only; it does not alter bookings or tables.
update public.venues
set
  name = 'The Promotr Lounge',
  venue_facts = jsonb_build_object(
    'factsVersion', 'promotr-venue-facts.v2',
    'name', 'The Promotr Lounge',
    'address', '123 King Street West, Toronto, Ontario',
    'minimumAge', 19,
    'identification', 'Valid government-issued photo ID is required. No exceptions.',
    'hours', jsonb_build_object(
      'thursday', '10:00 PM-3:00 AM',
      'friday', '10:00 PM-3:00 AM',
      'saturday', '10:00 PM-3:00 AM',
      'sundayToWednesday', 'Closed unless a special event is confirmed'
    ),
    'entry', jsonb_build_object('generalCoverCad', 20, 'admissionGuaranteed', false),
    'guestList', jsonb_build_object(
      'coverCad', 0,
      'condition', 'Every guest in the party must arrive before 11:00 PM',
      'admissionGuaranteed', false
    ),
    'tables', jsonb_build_object(
      'highTop', jsonb_build_object('minimumSpendCad', 500, 'includedEntryUpTo', 5),
      'booth', jsonb_build_object('minimumSpendCad', 1500, 'includedEntryUpTo', 10),
      'liveAvailabilityKnown', false
    ),
    'music', jsonb_build_array('Hip-hop', 'R&B', 'Afrobeats', 'house', 'Top 40', 'club hits', 'party anthems'),
    'dressCode', jsonb_build_object(
      'recommendation', 'Upscale and stylish',
      'cleanStylishSneakers', 'May be accepted depending on the full outfit',
      'hats', 'Discouraged',
      'notAllowed', jsonb_build_array('sports jerseys', 'sweatpants', 'baggy clothing', 'beachwear', 'work boots', 'dirty or worn sneakers'),
      'finalDiscretion', 'Venue security and management'
    ),
    'celebrations', jsonb_build_object('cakesAllowed', true, 'complimentaryExtrasGuaranteed', false),
    'service', jsonb_build_object('bottleService', 'Available through a table reservation', 'fullBar', true, 'foodAvailable', true),
    'transport', jsonb_build_object('dedicatedParkingClaimed', false, 'guidance', jsonb_build_array('Nearby paid parking', 'TTC', 'Uber', 'Lyft', 'taxi', 'walking')),
    'walkIns', 'Allowed, subject to capacity and door policies',
    'vipMeaning', 'Table service'
  ),
  ai_configuration = coalesce(ai_configuration, '{}'::jsonb) || jsonb_build_object(
    'promptVersion', 'vera.v2',
    'maxRecentMessages', 8,
    'maxOutputTokens', 300,
    'maxQuestionsPerReply', 1
  ),
  updated_at = now()
where slug = 'promotr-nightclub';
