-- Create storage bucket for product images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Allow public read access to product images
create policy "Public read access for product images"
on storage.objects for select
using (bucket_id = 'product-images');

-- Allow authenticated users (admins) to upload/update/delete
create policy "Admin upload access for product images"
on storage.objects for insert
with check (
  bucket_id = 'product-images'
  and auth.role() = 'service_role'
);

create policy "Admin update access for product images"
on storage.objects for update
using (
  bucket_id = 'product-images'
  and auth.role() = 'service_role'
);

create policy "Admin delete access for product images"
on storage.objects for delete
using (
  bucket_id = 'product-images'
  and auth.role() = 'service_role'
);
