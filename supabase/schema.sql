-- FairDish — ฐานข้อมูลของระบบกลุ่ม (รันครั้งเดียวใน Supabase → SQL Editor)
--
-- หลักความปลอดภัย:
--   * หน้าเว็บใช้ anon/publishable key ซึ่งเป็นค่าสาธารณะ จึงปิดสิทธิ์อ่าน/เขียนตาราง groups ตรง ๆ ทั้งหมด
--     (กันไม่ให้ใครดึงรายชื่อกลุ่มของคนอื่นได้)
--   * เข้าถึงได้ผ่านฟังก์ชัน 3 ตัวด้านล่างเท่านั้น และต้องรู้รหัสกลุ่ม (สุ่ม 12 ตัว) ถึงจะอ่าน/แก้ได้
--   * save_group เช็ก version กันไม่ให้คนสองคนเขียนทับกัน

create table if not exists public.groups (
  id          text primary key,
  name        text not null check (char_length(name) between 1 and 40),
  data        jsonb not null default '{}'::jsonb
              check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 200000),
  version     integer not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- v4.11: กุญแจของคนสร้างกลุ่ม (สุ่มตอนสร้าง ส่งกลับไปเก็บในเครื่องคนสร้างเท่านั้น) ใช้ยุบกลุ่มได้คนเดียว
alter table public.groups add column if not exists owner_key text;

alter table public.groups enable row level security;
revoke all on table public.groups from anon, authenticated;

-- สร้างกลุ่มใหม่ → { id, name, version, owner } (owner = กุญแจยุบกลุ่ม v4.11)
create or replace function public.create_group(p_name text, p_data jsonb)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   text;
  v_name text := btrim(coalesce(p_name, ''));
  v_owner text := replace(gen_random_uuid()::text, '-', '');
begin
  if char_length(v_name) = 0 or char_length(v_name) > 40 then
    raise exception 'invalid group name';
  end if;
  loop
    v_id := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    begin
      insert into groups (id, name, data, owner_key) values (v_id, v_name, coalesce(p_data, '{}'::jsonb), v_owner);
      exit;
    exception when unique_violation then
      -- รหัสซ้ำ (แทบไม่เกิด) สุ่มใหม่
    end;
  end loop;
  return json_build_object('id', v_id, 'name', v_name, 'version', 1, 'owner', v_owner);
end;
$$;

-- อ่านกลุ่ม → { id, name, data, version } หรือ null ถ้าไม่พบ
create or replace function public.get_group(p_id text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object('id', id, 'name', name, 'data', data, 'version', version)
  from groups where id = p_id;
$$;

-- บันทึกบิลของกลุ่ม ถ้า version ตรง → { ok:true, version }
-- ถ้ามีคนบันทึกไปก่อน → { ok:false, version, name, data } (ข้อมูลล่าสุด)
-- ถ้าไม่พบกลุ่ม → { ok:false, missing:true }
create or replace function public.save_group(p_id text, p_data jsonb, p_version integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  r groups;
begin
  update groups
     set data = p_data, version = version + 1, updated_at = now()
   where id = p_id and version = p_version
  returning * into r;
  if found then
    return json_build_object('ok', true, 'version', r.version);
  end if;
  select * into r from groups where id = p_id;
  if not found then
    return json_build_object('ok', false, 'missing', true);
  end if;
  return json_build_object('ok', false, 'version', r.version, 'name', r.name, 'data', r.data);
end;
$$;

-- v4.11: ยุบกลุ่ม — ลบได้เฉพาะคนที่ถือกุญแจของคนสร้าง (กลุ่มที่สร้างก่อน v4.11 ไม่มีกุญแจ ยุบไม่ได้)
create or replace function public.delete_group(p_id text, p_owner text)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from groups
   where id = p_id and owner_key is not null and owner_key = p_owner;
  return json_build_object('ok', found);
end;
$$;

-- (ไม่บังคับ) ลบกลุ่มที่ไม่มีใครแก้นานเกิน 90 วันอัตโนมัติ — เปิด extension pg_cron ใน Supabase ก่อน แล้วรัน:
--   select cron.schedule('fairdish-cleanup', '0 3 * * *',
--     $$delete from public.groups where updated_at < now() - interval '90 days'$$);

revoke all on function public.create_group(text, jsonb) from public;
revoke all on function public.get_group(text) from public;
revoke all on function public.save_group(text, jsonb, integer) from public;
grant execute on function public.create_group(text, jsonb) to anon, authenticated;
grant execute on function public.get_group(text) to anon, authenticated;
grant execute on function public.save_group(text, jsonb, integer) to anon, authenticated;
revoke all on function public.delete_group(text, text) from public;
grant execute on function public.delete_group(text, text) to anon, authenticated;
