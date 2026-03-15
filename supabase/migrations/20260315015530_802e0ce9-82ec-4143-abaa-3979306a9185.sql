
-- Allow public users to update the 'aprovada' field on fotos for public galleries
CREATE POLICY "Public photo selection"
ON public.fotos
FOR UPDATE
TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM galerias g
  WHERE g.id = fotos.galeria_id AND g.link_publico IS NOT NULL
))
WITH CHECK (EXISTS (
  SELECT 1 FROM galerias g
  WHERE g.id = fotos.galeria_id AND g.link_publico IS NOT NULL
));
