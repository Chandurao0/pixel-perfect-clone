
-- Create design sessions table
CREATE TABLE public.design_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT,
  analysis JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'generating', 'complete', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create variations table
CREATE TABLE public.design_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.design_sessions(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  label TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  saved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create uploaded images table
CREATE TABLE public.session_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.design_sessions(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  angle_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.design_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_images ENABLE ROW LEVEL SECURITY;

-- RLS policies for design_sessions (allow anonymous for now, user_id can be null)
CREATE POLICY "Anyone can create sessions" ON public.design_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view sessions" ON public.design_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can update sessions" ON public.design_sessions FOR UPDATE USING (true);

-- RLS policies for design_variations
CREATE POLICY "Anyone can insert variations" ON public.design_variations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view variations" ON public.design_variations FOR SELECT USING (true);
CREATE POLICY "Anyone can update variations" ON public.design_variations FOR UPDATE USING (true);

-- RLS policies for session_images
CREATE POLICY "Anyone can insert images" ON public.session_images FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view images" ON public.session_images FOR SELECT USING (true);

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- Storage policies
CREATE POLICY "Anyone can upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "Anyone can view product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

-- Update trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_design_sessions_updated_at
BEFORE UPDATE ON public.design_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
