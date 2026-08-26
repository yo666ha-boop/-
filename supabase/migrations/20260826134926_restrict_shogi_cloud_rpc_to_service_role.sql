revoke execute on function public.shogi_cloud_get(text) from public, anon, authenticated;
revoke execute on function public.shogi_cloud_put(text,bigint,text,jsonb) from public, anon, authenticated;
grant execute on function public.shogi_cloud_get(text) to service_role;
grant execute on function public.shogi_cloud_put(text,bigint,text,jsonb) to service_role;
