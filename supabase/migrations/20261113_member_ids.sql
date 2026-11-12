-- Member IDs: a unique 4-digit number per member, kept for life.
--
-- * member_ids is the registry: every number ever issued, so none is reused.
-- * membership_members.member_uid holds the number on each member row. The same
--   person keeps their number across purchases (matched on name + email), so
--   the column is not unique by itself.
-- * New member rows get a number automatically (trigger), reusing the person's
--   earlier number when they bought before.
-- * Backfills the 2027 member list (219 IDs), hides the duplicate Fazeel Bhatti
--   household, and adds the members from the list who had no current membership.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Registry + column
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_ids (
  member_uid  smallint PRIMARY KEY CHECK (member_uid BETWEEN 1000 AND 9999),
  name        text NOT NULL,
  email       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.member_ids ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_ids FROM anon, authenticated;
GRANT ALL ON public.member_ids TO service_role;

ALTER TABLE public.membership_members
  ADD COLUMN IF NOT EXISTS member_uid smallint REFERENCES public.member_ids(member_uid);
CREATE INDEX IF NOT EXISTS membership_members_member_uid_idx ON public.membership_members (member_uid);

-- Households created by mistake (e.g. a family registered twice). Kept for the
-- payment record but left out of the members directory.
ALTER TABLE public.membership_households
  ADD COLUMN IF NOT EXISTS is_duplicate boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 2) Number assignment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_member_uid(p_name text, p_email text)
RETURNS smallint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_name  text := lower(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'));
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_uid   smallint;
begin
  if v_name = '' then
    return null;
  end if;

  -- Same person bought before: reuse their number (prefer non-duplicate, newest)
  select m.member_uid into v_uid
  from membership_members m
  left join membership_households h on h.id = m.household_id
  where m.member_uid is not null
    and lower(regexp_replace(btrim(m.name), '\s+', ' ', 'g')) = v_name
    and nullif(lower(btrim(coalesce(nullif(m.email, ''), h.primary_email, ''))), '') is not distinct from v_email
  order by coalesce(h.is_duplicate, false), m.created_at desc
  limit 1;
  if v_uid is not null then
    return v_uid;
  end if;

  -- Number reserved in the registry for this person (e.g. added before they had a row)
  select i.member_uid into v_uid
  from member_ids i
  where lower(regexp_replace(btrim(i.name), '\s+', ' ', 'g')) = v_name
    and (i.email is null or v_email is null or lower(btrim(i.email)) = v_email)
    and not exists (select 1 from membership_members m where m.member_uid = i.member_uid)
  order by i.created_at
  limit 1;
  if v_uid is not null then
    return v_uid;
  end if;

  -- New person: random unused number
  loop
    v_uid := (1000 + floor(random() * 9000))::smallint;
    insert into member_ids (member_uid, name, email)
    values (v_uid, btrim(p_name), v_email)
    on conflict (member_uid) do nothing;
    exit when found;
  end loop;
  return v_uid;
end;
$$;

CREATE OR REPLACE FUNCTION public.membership_members_set_uid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_primary text;
begin
  if new.member_uid is null then
    select primary_email into v_primary from membership_households where id = new.household_id;
    new.member_uid := assign_member_uid(new.name, coalesce(nullif(new.email, ''), v_primary));
  end if;
  return new;
end;
$$;

DROP TRIGGER IF EXISTS membership_members_set_uid ON public.membership_members;
CREATE TRIGGER membership_members_set_uid
  BEFORE INSERT ON public.membership_members
  FOR EACH ROW EXECUTE FUNCTION public.membership_members_set_uid();

REVOKE EXECUTE ON FUNCTION public.assign_member_uid(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.membership_members_set_uid() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_member_uid(text, text) TO service_role;

-- ---------------------------------------------------------------------------
-- 3) Members directory skips households marked as duplicates
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.members_directory(
  p_purchased_from TIMESTAMPTZ DEFAULT NULL,
  p_qualify TEXT DEFAULT 'any'
)
RETURNS SETOF public.membership_members
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT m.*
  FROM public.membership_members m
  WHERE NOT EXISTS (
      SELECT 1 FROM public.membership_households d
      WHERE d.id = m.household_id AND d.is_duplicate
    )
    AND (
      p_purchased_from IS NULL
      OR m.household_id IN (
        SELECT DISTINCT ON (COALESCE(LOWER(TRIM(h.primary_email)), h.id::text)) h.id
        FROM public.membership_households h
        WHERE NOT h.is_duplicate
          AND (
            (COALESCE(p_qualify, 'any') IN ('any', 'purchase') AND h.created_at >= p_purchased_from)
            OR (COALESCE(p_qualify, 'any') IN ('any', 'subscription') AND h.subscription_status = 'active')
          )
        ORDER BY COALESCE(LOWER(TRIM(h.primary_email)), h.id::text), h.created_at DESC
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- 4) Fazeel Bhatti and Shawana Yousaf registered twice by mistake; their
--    membership is the Tariq Bhatti household. Mark the extra one.
--    (Its Stripe subscription must be cancelled in Stripe separately.)
-- ---------------------------------------------------------------------------
UPDATE public.membership_households
SET is_duplicate = true
WHERE id = 'd74c8821-d752-4f5f-9904-0517684e9a75';

-- ---------------------------------------------------------------------------
-- 5) 2027 member list
-- ---------------------------------------------------------------------------
-- registry
INSERT INTO public.member_ids (member_uid, name, email) VALUES
  (2491, 'Aamina Obaid', 'mobaidzia@gmail.com'),
  (2896, 'Aarash Afruz Rahman', 'md.a.rahman101@gmail.com'),
  (7456, 'Abdelmajeed Issa', 'king4malik@gmail.com'),
  (1978, 'Abdelmalik Issa', 'king4malik@gmail.com'),
  (1711, 'Abdulaziz Yusufjanov', 'yabdulaziz123@gmail.com'),
  (1826, 'Abdullah Al Fatta', 'abdullah.pme47@gmail.com'),
  (4591, 'Abdullah Ibrahim Muhammad', 'abdullahmuhammad9944@gmail.com'),
  (5500, 'Abdus Khan', 'abduskhan46@yahoo.com'),
  (6396, 'Abir', 'mymuny.iba@gmail.com'),
  (3052, 'Adam shatila', 'topramen199@gmail.com'),
  (3327, 'Adnan Khan', 'adnanvoice@gmail.com'),
  (8314, 'Afshan Nooreen', 'zul_annie020@yahoo.com'),
  (9004, 'Ahmad Salah Esmat', 'ahmad.esmat99@gmail.com'),
  (2490, 'Ahmed Abdelnaby', 'amhashem85@gmail.com'),
  (3233, 'Ahmed Eldeiry', 'eldeirya@gmail.com'),
  (1022, 'Aish Sawie', 'aishsawie@gmail.com'),
  (6792, 'Alaa Eldeiry', 'aeldeiry7@gmail.com'),
  (1431, 'Ali Eldeiry', 'alieldeiry777@gmail.com'),
  (9056, 'Ali Kakakhel', 'alikakakhel@yahoo.com'),
  (7356, 'Ali Mehdawi', 'a_mezo_10@yahoo.com'),
  (2692, 'Ali Zineddin', 'alizineddin@hotmail.com'),
  (9126, 'Alison Shields', 'alikat1320@gmail.com'),
  (1111, 'Amal shatila', 'amalshatila@yahoo.com'),
  (4054, 'Amanda Northcutt', 'mancutt@gmail.com'),
  (2784, 'Amany Elkahwagy', 'nanykahwagy@yahoo.com'),
  (6406, 'Amayra Mahzabin Rahman', 'md.a.rahman101@gmail.com'),
  (5048, 'Amel Ksaibati', 'aksaibati1@gmail.com'),
  (3998, 'Amin', 'a.muhaydean53@gmail.com'),
  (6035, 'Amr Shehata', 'shehata_amr@yahoo.com'),
  (6333, 'Asad Aziz', 'cafund@gmail.com'),
  (1478, 'Asad Dossani', 'asad.dossani@gmail.com'),
  (3563, 'Asmaa Eldeiry', 'aseldeiry@gmail.com'),
  (4915, 'Aya Elhemri', 'aya.elhemri@colostate.edu'),
  (7763, 'Aylin Uctuk', 'tamilg1@gmail.com'),
  (5876, 'Aymn Elhaddad', 'elhaddads@gmail.com'),
  (6585, 'Azmal Hossan', 'azmal_sociology@yahoo.com'),
  (5076, 'Bassel Elhaddad', 'bassel.elhaddad@gmail.com'),
  (8525, 'Belgasem Belgasem', 'bbelgasem@gmail.com'),
  (7692, 'Boubacar Diatta', 'diattab@hotmail.com'),
  (9449, 'Cynthia Worayeth', 'cworayeth@yahoo.com'),
  (1786, 'Dlaihi Alhajri', 'dulaihi007@gmail.com'),
  (2005, 'Doaa Mahmoud', 'doaa.ahmed2912@gmail.com'),
  (8325, 'Doha Shahba', 'dohashahba5@gmail.com'),
  (8278, 'Ece Karagoz', 'enes.karagoz@colostate.edu'),
  (3617, 'Eman Fallah', 'emanfallah@gmail.com'),
  (6475, 'Enas Elnaklawi', 'enas.elnaklawi@gmail.com'),
  (8977, 'Fabiha Ghory', 'ghory_fazle@yahoo.com'),
  (4021, 'Faiq', 'faiqmajeed@hotmail.com'),
  (9140, 'Fardeen Wasey', 'fardeenwasey2997@gmail.com'),
  (8494, 'Fatam Abdelnaby', 'fahashem009@gmail.com'),
  (2767, 'Fatima Reda', 'redafa789@gmail.com'),
  (7165, 'Fazeel Bhatti', 'fazeelhb@gmail.com'),
  (3337, 'Fazilhaq Hashimi', 'fazilhaq_hashimi@yahoo.com'),
  (8983, 'Fazle Ghory', 'ghory_fazle@yahoo.com'),
  (9060, 'Ferah aziz', 'ferah_aziz@launchphase2.com'),
  (1066, 'Fizah Saeed', 'fizahsaeed@gmail.com'),
  (2875, 'Ganah Elhemri', 'ganah.elhemri@gmail.com'),
  (3448, 'Grace Hudgens', 'grace.hudg@gmail.com'),
  (9791, 'Habib Anwar', 'habibkhadbai@gmail.com'),
  (3443, 'Halima', 'halima.qudrat01@gmail.com'),
  (8704, 'Hamza Khalid', 'hamza.khalid200147@gmail.com'),
  (4436, 'Hamzah Siddiqui', 'hamzahsiddiqui745@gmail.com'),
  (8924, 'Hana Gatlawi', 'hanaeljet2005001@yahoo.com'),
  (8613, 'Hanan Abdelkader', 'hanan_abdelkader@yahoo.com'),
  (3919, 'Hani Shatila', 'hanishatila@yahoo.com'),
  (4522, 'Haniya Kakakhel', 'khatoon_k@yahoo.com'),
  (9625, 'Harith Z Younis', 'zeki124@yahoo.com'),
  (1601, 'Hasan Najib Mahmud', 'hasannajib305@gmail.com'),
  (3731, 'Hasive Ahmad', 'hasive.ahmad@colostate.edu'),
  (5731, 'Hasna Kanjo', 'hkanjo@hotmail.com'),
  (7450, 'Hasnain Ghory', 'ghory_malka@yahoo.com'),
  (9599, 'Hend Ibrahim', 'hendibrahim1@gmail.com'),
  (7847, 'Hewaida elbadry', 'hewaida@gmail.com'),
  (6570, 'Hosam Ahmad Almallah', 'hosam.ahmad@colostate.edu'),
  (1963, 'Hud Wahab', 'hudwahab@gmail.com'),
  (3004, 'Huda A Taqa', 'hudataqa@yahoo.com'),
  (3997, 'Ibrahim Alazraq', 'lazrig@yahoo.com'),
  (5135, 'Ilyas Dossani', 'asad.dossani@gmail.com'),
  (5970, 'Imana Dossani', 'asad.dossani@gmail.com'),
  (6300, 'Inaya Dossani', 'asad.dossani@gmail.com'),
  (1236, 'Irfan Dossani', 'asad.dossani@gmail.com'),
  (5909, 'Ismail Rahman Fallgren', 'ismailrahmanfallgren@gmail.com'),
  (6640, 'Israa Eldeiry', 'eldeiryisraa@gmail.com'),
  (6663, 'Istiak Mahmood Rahi', 'istiakrahizero@gmail.com'),
  (8700, 'Jamie Forde', 'jrforde1@msn.com'),
  (8104, 'Janet Pena', 'jpena0111@gmail.com'),
  (3757, 'Jannatul Ferdoss', 'jannat98rumi@gmail.com'),
  (1570, 'Jordan Hamori', 'hishartusa@gmail.com'),
  (7309, 'Jude Issa', 'king4malik@gmail.com'),
  (6873, 'Justin Infanger', 'j.infanger@gmail.com'),
  (4221, 'Khabeer', 'akhabeer.karimi@gmail.com'),
  (9952, 'Khadija Reda', 'kjreda123@gmail.com'),
  (9915, 'Khaled ksaibati', 'khaled@uwyo.edu'),
  (8151, 'Khalid Shahba', 'khalidshahba2002@gmail.com'),
  (3053, 'Khandaker Sharmin Ashrafi', 'sarnaphysics@yahoo.com'),
  (8254, 'Lucy Fernanda', 'lucyfernanda2812@gmail.com'),
  (2908, 'Maha Obaid', 'mobaidzia@gmail.com'),
  (9289, 'Mahmoud Elramly', 'melrmly@yahoo.com'),
  (9487, 'Mahmoud Elnahla', 'md.elnahla@gmail.com'),
  (9351, 'Mahmoud Elnaklawi', 'mahmoudelnaklawi@yahoo.com'),
  (9504, 'Mahzabin Akhter', 'mahzabinakhter8@gmail.com'),
  (1578, 'Mai Mohamed', 'drmaigamal2018@gmail.com'),
  (3565, 'Maira Tariq', 'thbmaira@gmail.com'),
  (9563, 'Malka Ghory', 'ghory_malka@yahoo.com'),
  (2324, 'Mammy Seck', 'seckmammy@gmail.com'),
  (8893, 'Manal Hafiz', 'manalhafizeg@gmail.com'),
  (9422, 'Marwan Obeidat', 'marwan.obeidat@gmail.com'),
  (3721, 'Maryam obeidat', 'marwan.obeidat@gmail.com'),
  (2127, 'Masfiq Reza', 'rezamasfiq@gmail.com'),
  (5792, 'Masroor Kakakhel', 'mkakakhel@yahoo.com'),
  (5457, 'Mauladad', 't.m.majeed711@gmail.com'),
  (6515, 'Md Atiqur Rahman', 'md.a.rahman101@gmail.com'),
  (3002, 'Md Fazle Rasul', 'fazlerasul3@gmail.com'),
  (8717, 'MD REJAUL HAQUE', 'rejaulju@gmail.com'),
  (3967, 'Mehreen Elahi', 'mehreenelahi@gmail.com'),
  (4012, 'Mehwesh Hasan', 'mehwesh.hasan@gmail.com'),
  (1060, 'Michael Northcutt', 'clearimageswc@gmail.com'),
  (7545, 'Miftah ahmad', 'gobagha@yahoo.com'),
  (6155, 'Misa Ksaibati', 'misaksaibati@hotmail.com'),
  (3705, 'Mohamad Adam Fakhrudin', 'fakhrudinadam553@gmail.com'),
  (1765, 'Mohamed Elnaklawi', 'mohamed.elnaklawi5@gmail.com'),
  (9395, 'Mohamed Mahmoud', 'm.fawzy1609@gmail.com'),
  (8537, 'Mohamed Othman', NULL),
  (8973, 'Mohamed Othman', 'phmuhammed2013@gmail.com'),
  (5264, 'Mohamed Worayeth', 'mworayeth@yahoo.com'),
  (7938, 'Mohammad Adnan Raza', 'mohdadnan.raza24@gmail.com'),
  (8661, 'Mohammad Obaid Zia', 'mobaidzia@gmail.com'),
  (9022, 'Mohammad Rayhan Uddin', 'georgerayhan71@gmail.com'),
  (9439, 'Mohammed Issa', 'missa6478@gmail.com'),
  (3539, 'Mohammed Safayet Arefin', 'safayet.arefin.84@gmail.com'),
  (3332, 'Mohiman Muneer', 'mohimanmuneer@gmail.com'),
  (2109, 'Moinul Islam', 'zar.moin105@gmail.com'),
  (1632, 'Mona Hebeshy', 'mhebeshy840@gmail.com'),
  (7201, 'Mostafa ElKady', 'moselkady@yahoo.com'),
  (4291, 'Mubassara Ahmad', 'mahmad0717@gmail.com'),
  (1602, 'Muddasir Attar', 'muddasirattar1999@gmail.com'),
  (7420, 'Muhammad Habibullah', 'hrakib.csu@gmail.com'),
  (1528, 'Muhammad Shujat Fareed', 'mshujatfareed.sap@gmail.com'),
  (1083, 'Muhammad Tahir', 'mtahirphy@yahoo.com'),
  (9631, 'Muhammed enes karagoz', 'enes.karagoz@colostate.edu'),
  (8663, 'Mujeebuddin Mohammed', 'rafiuddin.mohd4@gmail.com'),
  (2203, 'Mumtaz Hussain', 'mumtaz_hussain39@hotmail.com'),
  (3410, 'Mumtaz Razack', 'mumtazrazack15@gmail.com'),
  (8804, 'Muntaha Rafi', 'rafiuddin.mohd4@gmail.com'),
  (9725, 'Musfiq Nabeen', 'musfiqnabeen@gmail.com'),
  (6799, 'Nabila Ahmad', 'wildbagha@yahoo.com'),
  (9748, 'Mustafa Elramly', 'ramli357@yahoo.com'),
  (5575, 'Naeem Khan', 'nakhandh@gmail.com'),
  (3011, 'Narin karagoz', 'nrn.3711@gmail.com'),
  (9849, 'Naser Moin', 'nasnoormoin@gmail.com'),
  (2825, 'Nazea Khan chowdhury', 'nazeaparvez@gmail.com'),
  (7271, 'Noha Shahba', 'nohashahba5@gmail.com'),
  (4721, 'Noor Issa', 'nalhudaissa@gmail.com'),
  (2240, 'Nuha Shaik', 'khajasharif+nuha@gmail.com'),
  (4765, 'Nura Elmagbari', 'nura.elmagbari@gmail.com'),
  (6092, 'Oliver Speir', 'oliverspeir9@gmail.com'),
  (8956, 'Omar Reda', 'redaom@yahoo.com'),
  (1155, 'Paul Fallgren', 'pfallgren@yahoo.com'),
  (3973, 'perveen', 'perveenakhatrfc@gmail.com'),
  (4497, 'Qudratullah Hamidzai', 'q.hamidzai@gmail.com'),
  (3406, 'Rabeya Akhter', 'torabya@gmail.com'),
  (1851, 'Rabha Reda', 'rabha.o.reda@gmail.com'),
  (8994, 'Racha Alzen', 'racha.alzen@gmail.com'),
  (7327, 'rafiuddin mohammed', 'rafiuddin.mohd4@gmail.com'),
  (6933, 'Raiyyan Bhatti', 'raiyyanhb@gmail.com'),
  (3852, 'Rashad Ahmed Mohamed', 'rashad50159@gmail.com'),
  (1623, 'Reaz Bhuiyan', 'reaz.bhuiyan@colostate.edu'),
  (8758, 'Redwan Khalaji', NULL),
  (5586, 'Rezwan Parvez', 'rezwanulp@gmail.com'),
  (7446, 'Rijwana Haque Rafa', 'rejaulju@gmail.com'),
  (7695, 'Rodyna Abdelnaby', 'rodyhashem11@gmail.com'),
  (1376, 'Ruqaiya Siddiqui', 'yusufus@gmail.com'),
  (5600, 'S M Jamil Uddin', 'jamil.uap.bd@gmail.com'),
  (9307, 'S M Rashidul Hasan Nijhum', 'nijhum7349@gmail.com'),
  (9497, 'Saafin Bin Rizwan', 'rezwanulp@gmail.com'),
  (6206, 'Safiah Almallahi', 'aishsawie@yahoo.com'),
  (6023, 'Safwan Ahmad', 'safwanua05@gmail.com'),
  (1591, 'Safwan Ahsanullah', 'safwanahsanullah@gmail.com'),
  (3753, 'Sahar Habib', 'sahar.habib@yahoo.com'),
  (3770, 'Saima', 'sammiabhatti@gmail.com'),
  (6987, 'Saima Adnan', 'saimaadnan.email@gmail.com'),
  (9580, 'Saima Tariq', 'tsaima90@gmail.com'),
  (2551, 'Salah Abdel-Ghany', 'salahghany@gmail.com'),
  (8635, 'Samina Dossani', 'samina.dossani@gmail.com'),
  (8958, 'Sara Abdellatif', 'sm499797@gmail.com'),
  (9850, 'Sarah Olson', 'scolson21@gmail.com'),
  (1436, 'Selima Rehaiam', 'srehaiam@hotmail.com'),
  (1933, 'Sharif Shaik', 'haisharif@yahoo.com'),
  (3612, 'Sharmin Farzana Diti', 'sfarzana.diti@gmail.com'),
  (9308, 'Shawana Yousaf', 'shawanayousaf1@gmail.com'),
  (2058, 'Shawana Yousaf', 'shawanayousaf1@gmail.com'),
  (5729, 'Shehab Elhaddad', 'shehab.elhaddad@gmail.com'),
  (3446, 'Shumaila Hassan', 'tahir.shumaila@yahoo.com'),
  (8595, 'Tahiyyah Noor Fatima', 'tanjim.cse15@gmail.com'),
  (8173, 'Talat Hussain', 'raiyan4@yahoo.com'),
  (7328, 'Tami Uctuk', 'tamilg1@gmail.com'),
  (5223, 'Tanjim Bin Faruk', 'tanjim.cse15@gmail.com'),
  (5454, 'Tanya Johnson', 'montana59468@yahoo.com'),
  (7791, 'Tarek Elwassara', 'tareq.wsara@yahoo.com'),
  (7318, 'Tareq Kahala', 'tareq.kahala@gmail.com'),
  (7823, 'Tariq Bhatti', 'tariqhb@gmail.com'),
  (9198, 'Tasnim Ferdows Fatir', 'fatir.tasnim@gmail.com'),
  (7880, 'Towsibur Rahman', 'towsibur.aero08@gmail.com'),
  (3068, 'UMAR MAZLIN AL-MUKHTAR', 'umaralmukhtar84@gmail.com'),
  (1271, 'Uzair Ahmed Syed', 'uzair7733@gmail.com'),
  (4461, 'Wahidu Zzaman', 'iamwzman@yahoo.com'),
  (6468, 'Yasin Khadbai', 'yasinhabib@gmail.com'),
  (6128, 'Youssef Adelnab', 'mhebeshy840@gmail.com'),
  (9137, 'Yusuf Siddiqui', 'yusufus@gmail.com'),
  (7668, 'Zaara Shaik', 'khajasharif+zaara@gmail.com'),
  (6398, 'Zainab Khan', 'zainabmuneerkhan@gmail.com'),
  (6131, 'Zainab Obaid', 'mobaidzia@gmail.com'),
  (2053, 'Zeki Younnis', 'zeki147@yahoo.com'),
  (3710, 'Zero Tasnim', 'skjtasnim93@yahoo.com'),
  (1961, 'Zeyad Arhouma', 'zk_rahuma@yahoo.com'),
  (9570, 'Zeyad Gad', 'zedogad@gmail.com'),
  (1538, 'Zoya Binte Rizwan', 'rezwanulp@gmail.com'),
  (3608, 'Zubaida Bai', 'zubaidahabib@gmail.com'),
  (6487, 'Zubair Ahmed Syed', 'zubair1on@gmail.com')
ON CONFLICT (member_uid) DO NOTHING;

-- member rows (matched by name + email, all seasons)
UPDATE public.membership_members m SET member_uid = v.uid
FROM (VALUES
  ('cd0fb48f-cf51-4018-96de-4a6a25452224'::uuid, 2491),
  ('12471795-031d-47ff-ae32-bdfb1f96229b'::uuid, 2896),
  ('afa8a6ce-ff76-4aac-9073-c10b75a0d3f9'::uuid, 7456),
  ('368d91af-0508-4543-8d7d-51fc8f92e738'::uuid, 1978),
  ('a2bf5255-aad5-4a04-bba1-79ca7537d805'::uuid, 1978),
  ('7532a5fc-7572-46ee-9d75-6f9a9dd2ba60'::uuid, 1711),
  ('28b6dbaa-7dd6-4701-bd2b-e8afca8fa75f'::uuid, 1826),
  ('204036c0-f072-4fc8-ad1a-892d0d5e29f1'::uuid, 1826),
  ('d2b90cd9-20e1-42da-bc8c-6779ebaf87a3'::uuid, 4591),
  ('bf64d5c8-47bb-4771-8527-bfd0dc487908'::uuid, 5500),
  ('01d2ae05-d279-4092-818e-c8b05fe604f2'::uuid, 6396),
  ('b232f624-a31d-47b7-8dff-efbe3c261709'::uuid, 3052),
  ('6ed3f8e9-8592-469a-904a-b727d6fe8455'::uuid, 3327),
  ('64816be1-f953-4eac-9837-d7e8dab6178f'::uuid, 3327),
  ('d33d7d20-a03a-493c-839c-86f82ab1c828'::uuid, 8314),
  ('cd94ded0-5dd9-41e7-a1e1-5909a1819ef1'::uuid, 9004),
  ('181d199e-50e3-4830-a55e-85594e87bc67'::uuid, 2490),
  ('791598cc-4423-4621-93f0-efe2f6447523'::uuid, 3233),
  ('cb79d2b9-4583-42e7-974a-c5011ddc460c'::uuid, 3233),
  ('5b4e5dc6-c950-4521-8e1c-ce0ae19370fb'::uuid, 1022),
  ('77082ae5-fbb9-49f8-97d3-be5aed0398c8'::uuid, 1022),
  ('8971b43c-7378-48b3-a941-639648d48a5c'::uuid, 6792),
  ('24719a36-dfd2-4b4c-b76d-f78358823bda'::uuid, 6792),
  ('c2b00939-3799-48c3-8e85-90a4c76cf95f'::uuid, 1431),
  ('cde351a5-e7a1-402f-8268-a1378be8e05a'::uuid, 1431),
  ('c71d6809-1e5f-4a4c-9761-a0abf5fde12c'::uuid, 9056),
  ('1d990c5f-33be-4967-9b7b-d1879e92596b'::uuid, 7356),
  ('5b399052-6c53-4d19-bfc6-754bf88998bd'::uuid, 2692),
  ('3ba570f3-21df-4518-be87-b9a02243465c'::uuid, 2692),
  ('bd5189b8-db1a-4d92-ad80-5314e8cccbab'::uuid, 9126),
  ('3566b1eb-e5ad-4287-bc91-2efa4ca676da'::uuid, 9126),
  ('9569e666-0afe-4584-842e-5678aedb9637'::uuid, 1111),
  ('8f00fe57-0a10-472b-8b61-8b937b0b29dc'::uuid, 4054),
  ('f785689e-0002-4d3f-8e61-a73b45855363'::uuid, 2784),
  ('81db8ab8-f6c1-4949-9dde-a069199097ac'::uuid, 6406),
  ('433e50c2-6d5a-42f5-8f05-404838277095'::uuid, 5048),
  ('b90f96ee-64e6-41a3-9470-3e0e7f52a6fc'::uuid, 5048),
  ('fc2844e9-5134-4b70-a46f-c8e87e7ad24c'::uuid, 3998),
  ('614e973d-1019-4347-b6eb-10480042c2f6'::uuid, 6035),
  ('f41d098e-96ad-4650-9354-b4d148bfd8a9'::uuid, 6333),
  ('39d3a2a9-e93a-4081-a9b7-f65a74206abf'::uuid, 1478),
  ('7e9fa646-88ca-4547-96b1-174709dd69db'::uuid, 1478),
  ('10b7125f-d449-45de-9a36-b65f03f5717f'::uuid, 3563),
  ('e281c2f4-80ae-43d4-9b19-4946374a9138'::uuid, 4915),
  ('b3c0d24f-2931-469c-903d-66f1c8b52871'::uuid, 4915),
  ('db7481c8-b78b-4941-8f8c-994faac94399'::uuid, 7763),
  ('99757777-e5ca-40c2-9ede-a17a79b43d36'::uuid, 5876),
  ('677f53a0-fa4f-4596-84a7-2a65549acefd'::uuid, 5876),
  ('e0b35a37-9694-4bce-a216-6a2f0aff08c6'::uuid, 6585),
  ('5016e5fe-0128-4fdd-8446-4befd0443c79'::uuid, 6585),
  ('ddea1553-7863-463b-8071-85f7db972fb1'::uuid, 5076),
  ('09ac8615-91fa-4b9c-90ee-8d88a93f9442'::uuid, 5076),
  ('9b282ff2-232c-4630-9d5b-f5644d90994b'::uuid, 8525),
  ('93a74d53-63c1-48d5-a57c-93bd631c6d02'::uuid, 8525),
  ('e0c95069-003a-457e-84c7-4880d917efd3'::uuid, 7692),
  ('629dfa61-3442-4e50-adad-feff63482196'::uuid, 7692),
  ('9e0684ea-110a-4919-a74c-4d9aaddbf30c'::uuid, 9449),
  ('3185f4c9-6a54-4337-9a33-942635aa5c03'::uuid, 1786),
  ('6b2b49b5-566e-48de-869a-dc9a15ecd207'::uuid, 2005),
  ('a8c7e588-4bc7-4861-a053-9dda8497dd88'::uuid, 2005),
  ('30ef2a08-bdd4-4871-9508-288898c9f685'::uuid, 8325),
  ('b470e320-c701-4c07-a0fa-5e25e61285f9'::uuid, 8278),
  ('47fab395-a63a-40f4-a379-d6f84df83c8c'::uuid, 3617),
  ('810c2869-7d80-4251-9ecc-6f9e5f27202c'::uuid, 3617),
  ('6c7804f0-44ff-401e-b430-965e9cefd3fd'::uuid, 6475),
  ('4e0bf40d-5e5a-44c3-9af7-0a5ce32e2d40'::uuid, 6475),
  ('dc9c3eda-4bd5-412c-9dfe-e28b34e7809e'::uuid, 8977),
  ('6dcbffe8-5b0d-4b23-ae5c-fa8542cb7200'::uuid, 4021),
  ('b1ad5d6e-27d4-4ea1-aa3a-1b992776060c'::uuid, 9140),
  ('2c7268d4-10a7-4b4f-a53b-c857c165d670'::uuid, 8494),
  ('88be5bca-ef56-4c1d-a275-2fc106c8387b'::uuid, 2767),
  ('87709bd8-e7d8-4d28-ac4e-31e5cac01358'::uuid, 7165),
  ('a1dbc6e0-de15-44a7-b9af-d150fd8cd9f1'::uuid, 7165),
  ('7635e7bc-c17a-4721-bea2-379478285f31'::uuid, 7165),
  ('f91b1178-6ef0-498b-9dfd-5d7e5c991a45'::uuid, 3337),
  ('a386e5b5-2ddd-4dd2-9f67-7df3bfb63c18'::uuid, 8983),
  ('ab048a8c-48b8-4d5d-baf2-563121951860'::uuid, 8983),
  ('7ace5c51-e771-4fe7-bae4-287f73df6098'::uuid, 9060),
  ('5950cf4f-af43-43b0-9c3e-871af1cc680b'::uuid, 1066),
  ('e2b1172d-fab7-484f-ac6f-efa9d79a56c0'::uuid, 2875),
  ('2afcc330-5a97-4d1b-bf7e-b137564a00b3'::uuid, 3448),
  ('5f80696c-a557-4c97-8681-2d0ddc416aa6'::uuid, 9791),
  ('6db986af-5c64-4a60-a2b9-88d4492c76d0'::uuid, 3443),
  ('88435565-532c-4667-8e34-b6c7b05eb03a'::uuid, 8704),
  ('8c604565-f1df-45e8-8ae0-aa35096a87df'::uuid, 4436),
  ('ddb1d90e-2687-4c07-948a-6bc24b67235e'::uuid, 8924),
  ('d204b4e0-d769-44d5-99fc-0232b4e69a50'::uuid, 8613),
  ('7f6acbd4-2c63-4d26-a67c-f879cac3ad40'::uuid, 3919),
  ('782424ad-01cd-461f-9483-e29670eee15e'::uuid, 4522),
  ('e10c44a3-7c32-4984-9b14-b2b6d463a21e'::uuid, 9625),
  ('ea767936-485e-45df-b9ff-4d168c29f8bb'::uuid, 9625),
  ('70a3a79f-31f6-4d8c-b1f4-635c160314a0'::uuid, 1601),
  ('0270c176-0234-48a5-ba6d-afb96a00fbbb'::uuid, 1601),
  ('1b91f369-bd0a-437f-b69c-027cd7460065'::uuid, 3731),
  ('ec035f9c-1711-44cb-a72d-13f0d194fb2f'::uuid, 5731),
  ('e405d284-706d-47bf-acad-d81e40550ac2'::uuid, 7450),
  ('48a81805-0d6d-4434-ac71-88f8ee244797'::uuid, 9599),
  ('62ba4b6d-de7f-46da-988a-c57a6b8e395b'::uuid, 7847),
  ('0988302d-90b5-45f3-b114-512781a0e6bc'::uuid, 7847),
  ('e9d04600-b9e3-4010-a6c6-4fffe676fda0'::uuid, 6570),
  ('eb8e984d-f356-4988-b30a-990415cd7054'::uuid, 1963),
  ('c04a2228-473d-40f2-b503-159c0910527a'::uuid, 3004),
  ('cf08f2f5-787c-4a6d-b42e-c8517eb042df'::uuid, 3997),
  ('06e698ff-0b60-4b77-8341-815f2da4bca2'::uuid, 5135),
  ('addd68a2-848b-42c1-b567-3b67c740922a'::uuid, 5135),
  ('81a32115-7f52-4a60-8582-2cec649d4e91'::uuid, 5970),
  ('aed75991-77b8-4be5-9c78-9d54b359f986'::uuid, 5970),
  ('dede8b43-e6eb-4867-acc7-a3c7b2278588'::uuid, 6300),
  ('db45017a-6533-4983-bb29-960f1d1f8684'::uuid, 6300),
  ('048f8f45-8ff1-4a9a-8af2-846b6758b8eb'::uuid, 1236),
  ('27e0adcf-0914-40fd-8eac-b04a368c4023'::uuid, 1236),
  ('47424946-3be2-4c2b-97a7-e8b8f1525213'::uuid, 5909),
  ('5a2a6b40-d5d9-4189-a174-8b7dc6dc304d'::uuid, 6640),
  ('edc9d47e-db7f-4cc7-8fc7-9c20d0f9c52c'::uuid, 6640),
  ('8a386bde-88d5-4e40-adb0-8d1822b93944'::uuid, 6663),
  ('904aeb95-98b7-4e5a-ad13-995ed43a6ba2'::uuid, 8700),
  ('2f7ef9af-16a5-4162-9ddc-5811f8a99fd2'::uuid, 8104),
  ('5a511433-a995-49a9-bf75-508b263d2ecc'::uuid, 3757),
  ('103c9159-b6ad-4523-a46a-983ebeefc664'::uuid, 3757),
  ('c854d79a-f903-4aaf-ba51-80e6e8c0e2e6'::uuid, 1570),
  ('02d2d774-6c24-4e1e-adbf-e7334ed790db'::uuid, 1570),
  ('c624aded-7de7-405c-af59-4add87c8ccdf'::uuid, 7309),
  ('e912fe93-d240-44c5-804f-206980bd9573'::uuid, 6873),
  ('8c50b550-55ad-40f5-b6f6-f79a4e339436'::uuid, 4221),
  ('bf370187-9c67-4a83-b254-f8a8bf38c332'::uuid, 9952),
  ('aab0b0fa-8b3e-41a0-b81e-db698ff9f252'::uuid, 9915),
  ('c1a44206-86bd-49f0-8fe2-8b21880f171d'::uuid, 8151),
  ('164cb723-98d2-493c-ab14-a0356cdc6162'::uuid, 3053),
  ('ba92da05-9656-42eb-b745-0d6cb5fa9369'::uuid, 3053),
  ('2eebe50d-c72c-49b9-8a7c-b1afd138f345'::uuid, 8254),
  ('3c6bd9dd-4565-44d0-83df-cd9b30b635c7'::uuid, 8254),
  ('20757609-d1ee-4151-9aeb-d11447f8d742'::uuid, 2908),
  ('0207c938-0197-4684-a1fa-42a021e061f6'::uuid, 9289),
  ('b85e696b-66ec-438c-84f8-b01ff21e8685'::uuid, 9487),
  ('cc117da8-2cac-4d00-8bfa-47ac53d97534'::uuid, 9351),
  ('cc5b030d-8c61-48eb-96d8-12cd0955a36c'::uuid, 9351),
  ('5b697ab5-446e-415f-8ca5-0d361dbe4906'::uuid, 9504),
  ('8253b73f-3d27-4ee4-b1fa-a13fe6f5eb12'::uuid, 1578),
  ('21f7cf8f-314b-456e-b84d-3d9e0104b466'::uuid, 1578),
  ('e9545727-0c2a-4043-bc70-241d49894fee'::uuid, 3565),
  ('f54831ab-c170-43d5-8699-8d6c0c482352'::uuid, 3565),
  ('b41d5122-2ff5-4a8d-8cd8-79432f6976d7'::uuid, 9563),
  ('41a6a81c-e0e1-4a57-902a-308c90c7e837'::uuid, 9563),
  ('8afdc0e9-3dad-43c8-b9c3-1a660f668a42'::uuid, 2324),
  ('66e6b0e5-bb39-41e2-a534-1880574cbebc'::uuid, 2324),
  ('552923fb-87f5-4a18-a1c1-7b076210bec2'::uuid, 8893),
  ('96c554cf-7c63-43c3-b9f6-b2ef359048a3'::uuid, 9422),
  ('f5b40fad-ec36-443d-a4e4-60d60a4b0663'::uuid, 3721),
  ('76bbffec-8078-43e5-8eb2-3c95fce22434'::uuid, 2127),
  ('f85059ed-a36a-4121-9239-326ca3233dc8'::uuid, 2127),
  ('39553c19-b0b2-49ce-b7d9-e85ad401e55d'::uuid, 5792),
  ('0036877f-b9e4-456f-afd2-f053f4059def'::uuid, 5457),
  ('85a2bb9b-422c-447a-acdb-1b12996c7d9b'::uuid, 6515),
  ('1beec24d-e89d-48b8-b037-3296b6ecf97a'::uuid, 3002),
  ('a36ee90f-66d1-4829-bd7a-095083fed6eb'::uuid, 8717),
  ('c4e2982e-d7d3-4980-bb57-28ef08c5a2f2'::uuid, 8717),
  ('de31e510-fc65-44c3-beaf-1d7c8309f1fe'::uuid, 3967),
  ('0a8e7ea4-9b9e-4e1a-b49e-441a240f8624'::uuid, 3967),
  ('4fd5facc-9ae9-4c00-9340-4ececdf3d4f2'::uuid, 4012),
  ('3f893ec0-1615-4d5e-bb1f-43bef8c92d07'::uuid, 1060),
  ('82cd7516-6b0b-4ea0-a59b-49323a0ba563'::uuid, 7545),
  ('d2cbf78a-3bfb-4489-8842-4f59ad2d4586'::uuid, 7545),
  ('89b43e16-5092-4fb4-a619-e7f5954cd40f'::uuid, 6155),
  ('a3b20573-b792-4d55-ac5c-6d4b60ddcbf1'::uuid, 3705),
  ('c3070de2-bcfd-4d8d-b4f1-b07c716baa67'::uuid, 1765),
  ('fabeb0bd-beb5-4857-8023-1a72a9059497'::uuid, 1765),
  ('a80b87c2-c0d6-4a89-af41-4ed4ed667364'::uuid, 9395),
  ('d741f6e4-2f51-4398-bbae-28158e6b6dbb'::uuid, 9395),
  ('ed38c902-3be2-46b9-9f8f-ee61325b8b5e'::uuid, 8973),
  ('950dbe4f-b27a-48b8-9ba7-a492cb5ac755'::uuid, 8973),
  ('ee3f719a-7883-402d-83f4-66051286a997'::uuid, 5264),
  ('a99ba7aa-7b34-43ae-adaa-91bb293b788b'::uuid, 5264),
  ('72821e70-ae28-4c76-9ef2-02031f3cf9df'::uuid, 7938),
  ('ca07b6c3-4611-4fcc-a8e2-989986b50a5f'::uuid, 7938),
  ('b0736c33-f39e-4994-9c1b-02e72036052a'::uuid, 8661),
  ('e1649392-f6ab-4084-9c95-db257ff68b30'::uuid, 8661),
  ('2c74aa4b-7146-4f7e-a266-ff8d47572018'::uuid, 9022),
  ('dfcf8258-49e3-4308-953e-2da64ebf9850'::uuid, 9439),
  ('836fb602-3d1f-4724-bd5f-f2b7ad7beb2b'::uuid, 9439),
  ('b349b11a-16fe-4063-b2f6-0581980aeadb'::uuid, 3539),
  ('0abae836-299e-4fb6-9b90-56839ce651c3'::uuid, 3332),
  ('ccad9357-0c69-44a5-9330-7b5fbd9e362f'::uuid, 3332),
  ('3ae913da-c2d3-46ea-964e-815b73c2edf5'::uuid, 2109),
  ('db456d2f-0830-4fe0-a9f0-623619be6ffb'::uuid, 1632),
  ('99a71ea8-0674-40cb-b7a3-036a1dbf59bd'::uuid, 7201),
  ('8fe10e3f-61bd-4d30-8548-0d3465893668'::uuid, 4291),
  ('2aac109f-6143-4e1b-9517-86a4a229257d'::uuid, 4291),
  ('b8e9e444-3fc2-416c-a803-e768a91152c4'::uuid, 1602),
  ('0577e0d1-1f3a-4c14-9a8c-df93a99bacda'::uuid, 7420),
  ('b3ed89e1-8ef1-4aca-bf48-473224054ac1'::uuid, 7420),
  ('49b8d4e3-1717-48b4-a2fc-e3fe22824b39'::uuid, 1528),
  ('8eede4fe-e0ae-414d-8653-c85e063e1ede'::uuid, 1083),
  ('9b0e83c4-1de3-4698-a0d5-b2410560bd77'::uuid, 1083),
  ('6bb057eb-d186-4d5c-ba95-2477d53cb86d'::uuid, 9631),
  ('f5e1072e-1da9-43cb-9560-7c88adf8df69'::uuid, 8663),
  ('8c775379-8527-41ae-ab9b-702aa6441d84'::uuid, 2203),
  ('94aee70c-a1da-49b4-a1f2-a565f217482b'::uuid, 2203),
  ('8a38a06f-4a0c-484a-99d7-b965f269e281'::uuid, 3410),
  ('ed789fa4-8a4a-45be-b7f3-c8c9f54966b3'::uuid, 8804),
  ('099338f2-f89a-44e6-b20f-87d6206567f4'::uuid, 9725),
  ('9b3fc88c-3160-4180-88bb-d2cf44bb5d24'::uuid, 9725),
  ('b7f80aa8-04b0-4e90-b1db-63e61fda2947'::uuid, 6799),
  ('fbbf54ae-05e8-42c8-bb46-7f73b9a02e96'::uuid, 9748),
  ('be62e118-68ac-4f07-a41c-7a1fc3a447a2'::uuid, 5575),
  ('d0e93fd2-f025-4317-b05d-62017750a0ea'::uuid, 5575),
  ('45c6310c-7b64-4526-9318-8e1a035cf298'::uuid, 3011),
  ('192e919c-0a75-45ab-a572-a5353165a961'::uuid, 9849),
  ('26dbc619-b968-4de8-800f-1adc4ae767fe'::uuid, 2825),
  ('8cb129c9-f9ef-4721-b93c-3512880d9c5e'::uuid, 7271),
  ('f35b7ced-a897-4a26-b54b-dad558b3a357'::uuid, 4721),
  ('5932c6b4-8943-422f-a6cb-1df56eb3a9a7'::uuid, 4721),
  ('049a5095-3a41-4273-81e1-e0e44171a59c'::uuid, 2240),
  ('781084c2-6434-4968-8903-370214da3561'::uuid, 4765),
  ('95b6761f-1a53-4833-8b85-d41451944186'::uuid, 4765),
  ('170420c8-6785-4756-b065-fba32952e037'::uuid, 6092),
  ('89bede15-4e91-49a9-8c95-53940a7c8308'::uuid, 6092),
  ('8bdf90b5-2bb4-4c46-a244-e864d36a506a'::uuid, 8956),
  ('fbca83ce-3dcf-4af4-b374-35c59a121bd7'::uuid, 1155),
  ('ee3877ab-2cb1-425c-9b8d-80c1fddd6421'::uuid, 1155),
  ('d99655b7-327d-4423-923d-453b588363f2'::uuid, 3973),
  ('169c292d-f87c-4283-b68e-7d2628c6a8be'::uuid, 4497),
  ('c407e02a-1b3c-4a1b-9c55-1ab4fd96e810'::uuid, 4497),
  ('1d5fa556-44c2-4a4a-8d99-97166f604911'::uuid, 3406),
  ('cda864c2-e743-4aeb-b81c-abe7701be0b2'::uuid, 1851),
  ('fbf2fce4-e983-47d6-af41-e1c9d74c83fe'::uuid, 8994),
  ('3fe5ddd9-9c89-4cdc-9bcf-85dfa9bd8774'::uuid, 7327),
  ('c17b6bec-04a1-4a0e-8141-24e287c66eaa'::uuid, 6933),
  ('ce1b2b5f-4f82-41e2-b23d-c9728f59100f'::uuid, 6933),
  ('6eaf9028-df07-4b7b-b625-c6d28896a8cc'::uuid, 3852),
  ('556e383a-50f7-4d9b-ab71-5c7c55db0f7c'::uuid, 1623),
  ('463c7654-f363-4596-8a02-a67c0d021b3b'::uuid, 5586),
  ('bcc7272b-852f-452b-abdc-e451dd8e166b'::uuid, 7446),
  ('d0c08ab0-3b32-42ba-aa26-5e8f6286dccc'::uuid, 7446),
  ('757ea53d-7128-43ec-896c-198e86868006'::uuid, 7695),
  ('4319a5bb-7cab-451d-b50c-188947f08840'::uuid, 1376),
  ('358d8e46-6697-4e31-919f-f8ae502d3b88'::uuid, 5600),
  ('b9d88470-33cc-46b9-9312-673c91872e16'::uuid, 9307),
  ('66e914b0-3a2f-4be4-9247-50b012d35d23'::uuid, 9497),
  ('f8fdd94f-abbd-4ad3-822b-7b811f52a39f'::uuid, 6206),
  ('1af9bcac-f0c1-49eb-8697-7c140555b64c'::uuid, 6206),
  ('c0a5956c-91a7-4dc8-acb9-50ad1199ddfb'::uuid, 6023),
  ('837f2a67-d1ca-4b3b-a414-68a86d1b79d9'::uuid, 6023),
  ('e9c9a465-917a-43dc-b87f-b3a56d00996a'::uuid, 1591),
  ('dc2c2f3b-5b78-4934-8e6e-b1d6f65f36a1'::uuid, 1591),
  ('6ad94a55-ec2b-4b20-9015-d1bcd4146241'::uuid, 3753),
  ('4d5def59-9c53-4e11-8e65-5b98dbc7dff5'::uuid, 3770),
  ('df4671c0-69f7-4253-adef-57fc4a031bed'::uuid, 6987),
  ('8b1e6c5e-7eed-4f5e-a2f0-6ca2d0321bd0'::uuid, 9580),
  ('12b8155a-e9f8-408a-9d0e-7f10995645c7'::uuid, 9580),
  ('a0e42380-dd8d-42ab-85a1-5b7ff6c0404d'::uuid, 2551),
  ('3325d420-847f-49f3-9fc5-4fb7695c04bd'::uuid, 2551),
  ('72fe483d-65c3-4e93-bc40-65295fcabbf0'::uuid, 8635),
  ('a30e46ee-3eb1-461e-be6a-50251e790ca4'::uuid, 8635),
  ('14887f13-0aeb-4c9e-baeb-1ef6e74a818d'::uuid, 8958),
  ('48f5073f-e940-48aa-817e-f81b396468d9'::uuid, 9850),
  ('c7d59259-b874-41c7-9dbe-30d18d1020bb'::uuid, 9850),
  ('cebfa8f9-2006-4e86-b22e-b7ad651249ca'::uuid, 1436),
  ('1821f8ff-4851-4833-bb2e-d463d6ebdfd0'::uuid, 1933),
  ('605c3a04-2969-4092-9892-a72d0f6e3009'::uuid, 1933),
  ('59444047-183e-4f64-8d2b-b7390e60ac2d'::uuid, 3612),
  ('30eec958-40c1-40b1-8c8f-9b515e834459'::uuid, 9308),
  ('6c03aa95-91ff-4e19-9707-56c233ee936a'::uuid, 9308),
  ('6313bdd6-3a20-496f-bcff-ea3c10f614f8'::uuid, 2058),
  ('8d8809a4-f813-499a-ad34-8ea9121be146'::uuid, 5729),
  ('706a4286-ca3c-4c04-8c6b-8588509152df'::uuid, 5729),
  ('fe071d5c-8f34-4541-a8ae-4454148350e2'::uuid, 3446),
  ('11d4bc2c-ff1a-4c7e-978e-561195c856f7'::uuid, 3446),
  ('3928d616-524e-4b80-aafc-3dd4286a9037'::uuid, 8595),
  ('8e763835-0fa5-4f49-b003-ed761a11d471'::uuid, 8173),
  ('a3fd7b15-beba-4a38-b1c7-7ac632391645'::uuid, 8173),
  ('8c656588-2c90-43bd-9582-4aae423a9e9f'::uuid, 7328),
  ('1f3d6887-0181-4b70-beab-0d2fa86b0ef9'::uuid, 5223),
  ('acd3ca53-615b-4a01-a4e8-69a06d7dc3bd'::uuid, 5223),
  ('c0173f4a-e189-4fe5-aec5-b5bbd8c8a674'::uuid, 5454),
  ('3d5b7bc3-b2e3-4fb3-8220-1cf3445993fa'::uuid, 5454),
  ('121eca84-5b4f-475c-9c86-d78bfc22f63a'::uuid, 7791),
  ('1f0ffa74-4c07-4def-8048-432fa6db64cf'::uuid, 7791),
  ('2bdbc2ae-6845-46c8-b9ed-b07632688c99'::uuid, 7318),
  ('fee07908-465a-4be8-bee7-1dbc23724c9b'::uuid, 7823),
  ('097bff0e-460f-41b8-9512-79ee496b16f1'::uuid, 7823),
  ('1b090e1c-55ac-4357-9a9f-2a45cd96af2b'::uuid, 9198),
  ('b917c4c3-de04-4a11-b6d7-f482523b5ebe'::uuid, 9198),
  ('1f734817-a0d8-4aa1-a76a-448221d33547'::uuid, 7880),
  ('5f699f1b-7fe5-40e0-9a6a-bdec013ff24b'::uuid, 3068),
  ('f135af80-ab04-43d5-bf55-29f5fa9ab77a'::uuid, 3068),
  ('80d24efc-e78f-4e8b-bab1-459b270bd92a'::uuid, 1271),
  ('05df0461-6f25-43c8-ab20-29ddad08dd96'::uuid, 1271),
  ('23844cb8-695c-499e-8d0e-85b104ebb214'::uuid, 4461),
  ('98c50d36-fe4d-427c-997f-a6b07b2c9463'::uuid, 4461),
  ('628a06e6-6075-463f-8d7d-33dd20119387'::uuid, 6468),
  ('1757970c-e94d-46e0-b717-8c9442679777'::uuid, 6128),
  ('df96b1c9-9c26-4f54-ae70-a75c8e05c505'::uuid, 9137),
  ('046e7fda-16a2-4bc1-bf5a-dc0250a48ec9'::uuid, 9137),
  ('37af7281-5e32-46ce-81c8-3f53c062e2be'::uuid, 7668),
  ('9bec3c57-ceb2-48e0-a792-b308f0aca7f6'::uuid, 6398),
  ('c38b5061-5952-4a34-aa3f-258db2bcc9f0'::uuid, 6398),
  ('bc3d4f79-03c6-4a94-9efd-7d9059fe95a5'::uuid, 6131),
  ('2fb3b232-db49-4234-8eac-4e50c886639e'::uuid, 2053),
  ('3533cde0-8c5e-4f9d-ae90-696f4dd6807d'::uuid, 3710),
  ('a9c2307c-7cbf-420d-b693-61d0cca4c5fd'::uuid, 1961),
  ('c9c404ad-4c1b-461d-bb66-6773ef3db36c'::uuid, 1961),
  ('1b030340-1617-4488-a8db-e0e5f49c0b82'::uuid, 9570),
  ('5c3caf1c-4797-4a74-b123-c5ab6093e391'::uuid, 1538),
  ('25b3e00e-f544-40ed-867b-7ea1845b02df'::uuid, 3608),
  ('54eefb70-6a5d-424e-a43e-0ceb11c07e05'::uuid, 6487),
  ('fe57c9d3-9452-4a30-91e3-62e43f38b87c'::uuid, 6487)
) AS v(id, uid)
WHERE m.id = v.id;

-- ---------------------------------------------------------------------------
-- 6) On the 2027 list but without a current membership: add as active for
--    this year (no online payment recorded).
-- ---------------------------------------------------------------------------
WITH hh AS (
  INSERT INTO public.membership_households
    (primary_name, primary_email, primary_phone, recurrence, status, start_date, end_date)
  VALUES ('Mustafa Elramly', 'ramli357@yahoo.com', '9704889767', 'yearly', 'active',
          current_date, (current_date + interval '1 year')::date)
  RETURNING id
)
INSERT INTO public.membership_members
  (household_id, name, age, phone, email, sex, membership_type, price_cents, designation, member_uid, age_updated_at)
SELECT hh.id, v.name, v.age, v.phone, v.email, 'male', v.mtype, 0,
       v.designation::public.membership_designation, v.uid, now()
FROM hh, (VALUES
  ('Mustafa Elramly', 59, '9704889767', 'ramli357@yahoo.com', 'regular', 'head_of_household', 9748),
  ('Mahmoud Elramly', 25, '9704123673', 'melrmly@yahoo.com',  'regular', 'son_or_son_in_law', 9289)
) AS v(name, age, phone, email, mtype, designation, uid);

WITH hh AS (
  INSERT INTO public.membership_households
    (primary_name, primary_email, primary_phone, recurrence, status, start_date, end_date)
  VALUES ('Redwan Khalaji', NULL, '9704333048', 'yearly', 'active',
          current_date, (current_date + interval '1 year')::date)
  RETURNING id
)
INSERT INTO public.membership_members
  (household_id, name, age, phone, email, sex, membership_type, price_cents, designation, member_uid, age_updated_at)
SELECT hh.id, 'Redwan Khalaji', 0, '9704333048', NULL, 'male', 'senior', 0,
       'head_of_household'::public.membership_designation, 8758, now()
FROM hh;

-- ---------------------------------------------------------------------------
-- 7) Anyone in this season's directory still without a number gets one
--    (e.g. bought after the list was made).
-- ---------------------------------------------------------------------------
UPDATE public.membership_members m
SET member_uid = public.assign_member_uid(m.name, coalesce(nullif(m.email, ''), h.primary_email))
FROM public.membership_households h
WHERE h.id = m.household_id
  AND m.member_uid IS NULL
  AND NOT h.is_duplicate
  AND (h.created_at >= '2026-09-01' OR h.subscription_status = 'active');

COMMIT;
