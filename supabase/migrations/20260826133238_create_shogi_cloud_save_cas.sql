create table public.shogi_cloud_saves (
  save_key text primary key,
  revision bigint not null check (revision >= 1),
  updated_at timestamptz not null default now(),
  device_id text not null,
  payload jsonb not null,
  constraint shogi_cloud_saves_key_format check (save_key ~ '^[0-9a-f]{64}$'),
  constraint shogi_cloud_saves_device_length check (char_length(device_id) between 1 and 128),
  constraint shogi_cloud_saves_payload_object check (jsonb_typeof(payload) = 'object')
);

alter table public.shogi_cloud_saves enable row level security;
revoke all on table public.shogi_cloud_saves from public, anon, authenticated;

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
  where save_key = p_save_key;

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
    insert into public.shogi_cloud_saves(save_key,revision,updated_at,device_id,payload)
    values(p_save_key,1,now(),p_device_id,p_payload)
    on conflict (save_key) do nothing
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
  where save_key = p_save_key and revision = p_base_revision
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
  where save_key = p_save_key;

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

revoke all on function public.shogi_cloud_get(text) from public;
revoke all on function public.shogi_cloud_put(text,bigint,text,jsonb) from public;
grant execute on function public.shogi_cloud_get(text) to anon;
grant execute on function public.shogi_cloud_put(text,bigint,text,jsonb) to anon;
