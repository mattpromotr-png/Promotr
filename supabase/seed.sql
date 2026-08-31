insert into public.venues (slug, name, timezone, booking_form_url, venue_facts, ai_configuration)
values (
  'promotr-nightclub', 'Promotr Nightclub', 'America/Toronto', 'http://localhost:3000/book',
  '{"location":"Downtown Toronto","minimumAge":19,"capacityApproximate":500,"hours":{"friday":"22:00-03:00","saturday":"22:00-03:00"},"music":["Hip-hop","R&B","Afrobeats","Top 40","party anthems"],"entry":{"before23":20,"after23":30,"currency":"CAD","guaranteed":false}}'::jsonb,
  '{"promptVersion":"instagram-host.v1","maxRecentMessages":10,"maxOutputTokens":220}'::jsonb
)
on conflict (slug) do update set name = excluded.name, timezone = excluded.timezone,
booking_form_url = excluded.booking_form_url, venue_facts = excluded.venue_facts,
ai_configuration = excluded.ai_configuration, updated_at = now();
