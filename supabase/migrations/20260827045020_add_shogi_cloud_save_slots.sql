alter table public.shogi_cloud_saves
  add column slot_id text not null default 'default',
  add column slot_name text not null default 'これまでの保存';

alter table public.shogi_cloud_saves drop constraint shogi_cloud_saves_pkey;
alter table public.shogi_cloud_saves
  add constraint shogi_cloud_saves_pkey primary key (save_key, slot_id),
  add constraint shogi_cloud_saves_slot_id_format check (slot_id ~ '^[A-Za-z0-9_-]{1,80}$'),
  add constraint shogi_cloud_saves_slot_name_length check (char_length(slot_name) between 1 and 40);

create or replace function public.shogi_cloud_get(p_save_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.shogi_cloud_saves%rowtype;
begin
  if p_save_key is null or p_save_key !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_save_key' using errcode = '22023';
  end if;

  select * into v_record
  from public.shogi_cloud_saves
  where save_key = p_save_key and slot_id = 'default';

  if not found then
    return jsonb_build_object('status','ok','record',null);
  end if;

  return jsonb_build_object(
    'status','ok',
    'record',jsonb_build_object(
      'revision',v_record.revision,
      'updatedAt',(extract(epoch from v_record.updated_at) * 1000)::bigint,
      'deviceId',v_record.device_id,
      'payload',v_record.payload
    )
  );
end;
$$;

create or replace function public.shogi_cloud_put(
  p_save_key text,
  p_base_revision bigint,
  p_device_id text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.shogi_cloud_saves%rowtype;
  v_payload_bytes integer;
begin
  if p_save_key is null or p_save_key !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_save_key' using errcode = '22023';
  end if;
  if p_base_revision is null or p_base_revision < 0 then
    raise exception 'invalid_base_revision' using errcode = '22023';
  end if;
  if p_device_id is null or char_length(p_device_id) < 1 or char_length(p_device_id) > 128 then
    raise exception 'invalid_device_id' using errcode = '22023';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object'
     or coalesce((p_payload->>'version')::integer,0) <> 1
     or jsonb_typeof(p_payload->'st') <> 'object'
     or jsonb_typeof(p_payload->'st'->'b') <> 'array'
     or jsonb_array_length(p_payload->'st'->'b') <> 81
     or jsonb_typeof(p_payload->'st'->'log') <> 'array' then
    raise exception 'invalid_payload' using errcode = '22023';
  end if;
  v_payload_bytes := octet_length(p_payload::text);
  if v_payload_bytes > 524288 then
    raise exception 'payload_too_large' using errcode = '22023';
  end if;

  if p_base_revision = 0 then
    insert into public.shogi_cloud_saves(save_key,slot_id,slot_name,revision,updated_at,device_id,payload)
    values(p_save_key,'default','これまでの保存',1,now(),p_device_id,p_payload)
    on conflict (save_key,slot_id) do nothing
    returning * into v_record;
    if found then
      return jsonb_build_object('status','ok','record',jsonb_build_object(
        'revision',v_record.revision,
        'updatedAt',(extract(epoch from v_record.updated_at) * 1000)::bigint,
        'deviceId',v_record.device_id,
        'payload',v_record.payload
      ));
    end if;
  end if;

  update public.shogi_cloud_saves
  set revision = revision + 1,
      updated_at = now(),
      device_id = p_device_id,
      payload = p_payload
  where save_key = p_save_key and slot_id = 'default' and revision = p_base_revision
  returning * into v_record;

  if found then
    return jsonb_build_object('status','ok','record',jsonb_build_object(
      'revision',v_record.revision,
      'updatedAt',(extract(epoch from v_record.updated_at) * 1000)::bigint,
      'deviceId',v_record.device_id,
      'payload',v_record.payload
    ));
  end if;

  select * into v_record
  from public.shogi_cloud_saves
  where save_key = p_save_key and slot_id = 'default';

  return jsonb_build_object(
    'status','conflict',
    'record',case when found then jsonb_build_object(
      'revision',v_record.revision,
      'updatedAt',(extract(epoch from v_record.updated_at) * 1000)::bigint,
      'deviceId',v_record.device_id,
      'payload',v_record.payload
    ) else null end
  );
end;
$$;

create or replace function public.shogi_cloud_list(p_save_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slots jsonb;
begin
  if p_save_key is null or p_save_key !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_save_key' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'slotId',slot_id,
      'slotName',slot_name,
      'revision',revision,
      'updatedAt',(extract(epoch from updated_at) * 1000)::bigint,
      'savedAt',coalesce((payload->>'savedAt')::bigint,0),
      'character',payload->'ci',
      'ply',case when jsonb_typeof(payload->'st'->'log')='array' then jsonb_array_length(payload->'st'->'log') else 0 end
    ) order by updated_at desc
  ), '[]'::jsonb) into v_slots
  from public.shogi_cloud_saves
  where save_key = p_save_key;

  return jsonb_build_object('status','ok','slots',v_slots);
end;
$$;

create or replace function public.shogi_cloud_get_slot(p_save_key text, p_slot_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.shogi_cloud_saves%rowtype;
begin
  if p_save_key is null or p_save_key !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_save_key' using errcode = '22023';
  end if;
  if p_slot_id is null or p_slot_id !~ '^[A-Za-z0-9_-]{1,80}$' then
    raise exception 'invalid_slot_id' using errcode = '22023';
  end if;

  select * into v_record
  from public.shogi_cloud_saves
  where save_key = p_save_key and slot_id = p_slot_id;

  if not found then
    return jsonb_build_object('status','ok','record',null);
  end if;

  return jsonb_build_object(
    'status','ok',
    'record',jsonb_build_object(
      'slotId',v_record.slot_id,
      'slotName',v_record.slot_name,
      'revision',v_record.revision,
      'updatedAt',(extract(epoch from v_record.updated_at) * 1000)::bigint,
      'deviceId',v_record.device_id,
      'payload',v_record.payload
    )
  );
end;
$$;

create or replace function public.shogi_cloud_put_slot(
  p_save_key text,
  p_slot_id text,
  p_slot_name text,
  p_base_revision bigint,
  p_device_id text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.shogi_cloud_saves%rowtype;
  v_payload_bytes integer;
begin
  if p_save_key is null or p_save_key !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_save_key' using errcode = '22023';
  end if;
  if p_slot_id is null or p_slot_id !~ '^[A-Za-z0-9_-]{1,80}$' then
    raise exception 'invalid_slot_id' using errcode = '22023';
  end if;
  if p_slot_name is null or char_length(btrim(p_slot_name)) < 1 or char_length(p_slot_name) > 40 then
    raise exception 'invalid_slot_name' using errcode = '22023';
  end if;
  if p_base_revision is null or p_base_revision < 0 then
    raise exception 'invalid_base_revision' using errcode = '22023';
  end if;
  if p_device_id is null or char_length(p_device_id) < 1 or char_length(p_device_id) > 128 then
    raise exception 'invalid_device_id' using errcode = '22023';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object'
     or coalesce((p_payload->>'version')::integer,0) <> 1
     or jsonb_typeof(p_payload->'st') <> 'object'
     or jsonb_typeof(p_payload->'st'->'b') <> 'array'
     or jsonb_array_length(p_payload->'st'->'b') <> 81
     or jsonb_typeof(p_payload->'st'->'log') <> 'array' then
    raise exception 'invalid_payload' using errcode = '22023';
  end if;
  v_payload_bytes := octet_length(p_payload::text);
  if v_payload_bytes > 524288 then
    raise exception 'payload_too_large' using errcode = '22023';
  end if;

  if p_base_revision = 0 then
    insert into public.shogi_cloud_saves(save_key,slot_id,slot_name,revision,updated_at,device_id,payload)
    values(p_save_key,p_slot_id,btrim(p_slot_name),1,now(),p_device_id,p_payload)
    on conflict (save_key,slot_id) do nothing
    returning * into v_record;
    if found then
      return jsonb_build_object('status','ok','record',jsonb_build_object(
        'slotId',v_record.slot_id,
        'slotName',v_record.slot_name,
        'revision',v_record.revision,
        'updatedAt',(extract(epoch from v_record.updated_at) * 1000)::bigint,
        'deviceId',v_record.device_id,
        'payload',v_record.payload
      ));
    end if;
  end if;

  update public.shogi_cloud_saves
  set revision = revision + 1,
      updated_at = now(),
      device_id = p_device_id,
      slot_name = btrim(p_slot_name),
      payload = p_payload
  where save_key = p_save_key and slot_id = p_slot_id and revision = p_base_revision
  returning * into v_record;

  if found then
    return jsonb_build_object('status','ok','record',jsonb_build_object(
      'slotId',v_record.slot_id,
      'slotName',v_record.slot_name,
      'revision',v_record.revision,
      'updatedAt',(extract(epoch from v_record.updated_at) * 1000)::bigint,
      'deviceId',v_record.device_id,
      'payload',v_record.payload
    ));
  end if;

  select * into v_record
  from public.shogi_cloud_saves
  where save_key = p_save_key and slot_id = p_slot_id;

  return jsonb_build_object(
    'status','conflict',
    'record',case when found then jsonb_build_object(
      'slotId',v_record.slot_id,
      'slotName',v_record.slot_name,
      'revision',v_record.revision,
      'updatedAt',(extract(epoch from v_record.updated_at) * 1000)::bigint,
      'deviceId',v_record.device_id,
      'payload',v_record.payload
    ) else null end
  );
end;
$$;

revoke execute on function public.shogi_cloud_get(text) from public, anon, authenticated;
revoke execute on function public.shogi_cloud_put(text,bigint,text,jsonb) from public, anon, authenticated;
revoke execute on function public.shogi_cloud_list(text) from public, anon, authenticated;
revoke execute on function public.shogi_cloud_get_slot(text,text) from public, anon, authenticated;
revoke execute on function public.shogi_cloud_put_slot(text,text,text,bigint,text,jsonb) from public, anon, authenticated;
grant execute on function public.shogi_cloud_get(text) to service_role;
grant execute on function public.shogi_cloud_put(text,bigint,text,jsonb) to service_role;
grant execute on function public.shogi_cloud_list(text) to service_role;
grant execute on function public.shogi_cloud_get_slot(text,text) to service_role;
grant execute on function public.shogi_cloud_put_slot(text,text,text,bigint,text,jsonb) to service_role;
