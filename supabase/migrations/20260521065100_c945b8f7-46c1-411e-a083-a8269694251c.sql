-- Remove broad SELECT policy on avatars bucket that allowed listing all files.
-- The bucket remains public, so files are still accessible via their public URLs;
-- only the ability to enumerate/list bucket contents is removed.
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;