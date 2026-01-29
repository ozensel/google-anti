-- Sadece bu kısmı çalıştırın (Önceki kodları silin)

-- Eksik sütunları ekler (Hata vermez, varsa geçer)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS marital_status text,
ADD COLUMN IF NOT EXISTS job text;

-- Açıklama ekler (Opsiyonel)
COMMENT ON COLUMN public.profiles.gender IS 'User gender (male, female, other)';
COMMENT ON COLUMN public.profiles.marital_status IS 'User marital status (single, married, relationship)';
COMMENT ON COLUMN public.profiles.job IS 'User job or profession';
