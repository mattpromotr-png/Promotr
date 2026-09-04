insert into public.club_tables
  (id, venue_id, code, name, zone, capacity, minimum_spend_cad, deposit_cad, map_x, map_y)
select seed.id, v.id, seed.code, seed.name, seed.zone, seed.capacity,
  seed.minimum_spend, seed.deposit, seed.x, seed.y
from public.venues v
cross join (values
  ('10000000-0000-4000-8000-000000000001'::uuid,'L1','Lounge L1','Lounge',6,600,150,8,28),
  ('10000000-0000-4000-8000-000000000002'::uuid,'L2','Lounge L2','Lounge',6,600,150,8,50),
  ('10000000-0000-4000-8000-000000000003'::uuid,'P1','Premium VIP P1','Premium VIP',8,1200,300,86,28),
  ('10000000-0000-4000-8000-000000000004'::uuid,'P2','Premium VIP P2','Premium VIP',8,1200,300,86,50),
  ('10000000-0000-4000-8000-000000000005'::uuid,'D1','Dance floor D1','Dance floor',6,900,225,32,35),
  ('10000000-0000-4000-8000-000000000006'::uuid,'D2','Dance floor D2','Dance floor',6,900,225,44,35),
  ('10000000-0000-4000-8000-000000000007'::uuid,'S1','Stage VIP S1','Stage VIP',10,2000,500,34,17),
  ('10000000-0000-4000-8000-000000000008'::uuid,'S2','Stage VIP S2','Stage VIP',10,2000,500,47,17),
  ('10000000-0000-4000-8000-000000000009'::uuid,'S3','Stage VIP S3','Stage VIP',10,2000,500,60,17),
  ('10000000-0000-4000-8000-000000000010'::uuid,'S4','Stage VIP S4','Stage VIP',10,2000,500,73,17),
  ('10000000-0000-4000-8000-000000000011'::uuid,'D3','Dance floor D3','Dance floor',6,900,225,56,35),
  ('10000000-0000-4000-8000-000000000012'::uuid,'D4','Dance floor D4','Dance floor',6,900,225,68,35),
  ('10000000-0000-4000-8000-000000000013'::uuid,'D5','Dance floor D5','Dance floor',6,900,225,32,49),
  ('10000000-0000-4000-8000-000000000014'::uuid,'D6','Dance floor D6','Dance floor',6,900,225,44,49),
  ('10000000-0000-4000-8000-000000000015'::uuid,'D7','Dance floor D7','Dance floor',6,900,225,56,49),
  ('10000000-0000-4000-8000-000000000016'::uuid,'D8','Dance floor D8','Dance floor',6,900,225,68,49),
  ('10000000-0000-4000-8000-000000000017'::uuid,'D9','Dance floor D9','Dance floor',8,1100,275,32,63),
  ('10000000-0000-4000-8000-000000000018'::uuid,'D10','Dance floor D10','Dance floor',8,1100,275,44,63),
  ('10000000-0000-4000-8000-000000000019'::uuid,'D11','Dance floor D11','Dance floor',8,1100,275,56,63),
  ('10000000-0000-4000-8000-000000000020'::uuid,'D12','Dance floor D12','Dance floor',8,1100,275,68,63),
  ('10000000-0000-4000-8000-000000000021'::uuid,'L3','Lounge L3','Lounge',6,600,150,8,72),
  ('10000000-0000-4000-8000-000000000022'::uuid,'L4','Lounge L4','Lounge',6,600,150,18,28),
  ('10000000-0000-4000-8000-000000000023'::uuid,'L5','Lounge L5','Lounge',6,600,150,18,50),
  ('10000000-0000-4000-8000-000000000024'::uuid,'L6','Lounge L6','Lounge',6,600,150,18,72),
  ('10000000-0000-4000-8000-000000000025'::uuid,'P3','Premium VIP P3','Premium VIP',8,1200,300,76,28),
  ('10000000-0000-4000-8000-000000000026'::uuid,'P4','Premium VIP P4','Premium VIP',8,1200,300,76,50),
  ('10000000-0000-4000-8000-000000000027'::uuid,'P5','Premium VIP P5','Premium VIP',8,1200,300,76,72),
  ('10000000-0000-4000-8000-000000000028'::uuid,'P6','Premium VIP P6','Premium VIP',8,1200,300,86,72),
  ('10000000-0000-4000-8000-000000000029'::uuid,'B1','Back lounge B1','Back lounge',10,1500,400,42,82),
  ('10000000-0000-4000-8000-000000000030'::uuid,'B2','Back lounge B2','Back lounge',10,1500,400,58,82)
) seed(id,code,name,zone,capacity,minimum_spend,deposit,x,y)
where v.slug = 'promotr-nightclub'
on conflict (id) do update set
  code = excluded.code,
  name = excluded.name,
  zone = excluded.zone,
  capacity = excluded.capacity,
  minimum_spend_cad = excluded.minimum_spend_cad,
  deposit_cad = excluded.deposit_cad,
  map_x = excluded.map_x,
  map_y = excluded.map_y,
  active = true;
