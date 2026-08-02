CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TYPE public.booking_slot AS ENUM ('half_day', '24h');
CREATE TYPE public.reservation_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE public.payment_status AS ENUM ('unpaid', 'paid');
CREATE TYPE public.transaction_status AS ENUM ('success', 'failed');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.cabins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  name_ar text NOT NULL,
  capacity integer NOT NULL DEFAULT 2,
  description text NOT NULL DEFAULT '',
  description_ar text NOT NULL DEFAULT '',
  photos text[] NOT NULL DEFAULT '{}',
  included_package text[] NOT NULL DEFAULT '{}',
  included_package_ar text[] NOT NULL DEFAULT '{}',
  price_half_day numeric(10,2) NOT NULL DEFAULT 0,
  price_24h numeric(10,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cabins TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cabins TO authenticated;
GRANT ALL ON public.cabins TO service_role;
ALTER TABLE public.cabins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active cabins" ON public.cabins FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admins manage cabins" ON public.cabins FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER cabins_updated_at BEFORE UPDATE ON public.cabins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('ZW-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  cabin_id uuid NOT NULL REFERENCES public.cabins(id) ON DELETE RESTRICT,
  reservation_date date NOT NULL,
  slot public.booking_slot NOT NULL,
  cin text NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  date_of_birth date NOT NULL,
  guests_count integer NOT NULL DEFAULT 1,
  status public.reservation_status NOT NULL DEFAULT 'pending',
  total_price numeric(10,2) NOT NULL DEFAULT 0,
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX reservations_no_double_booking
  ON public.reservations (cabin_id, reservation_date, slot)
  WHERE status <> 'cancelled';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage reservations" ON public.reservations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  status public.transaction_status NOT NULL DEFAULT 'success',
  simulated boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view transactions" ON public.transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.cabins (slug, name, name_ar, capacity, description, description_ar, photos, included_package, included_package_ar, price_half_day, price_24h, sort_order) VALUES
('lagune','Bungalow Lagune','بنغالو البحيرة',2,'Un bungalow sur pilotis posé au bord de la lagune, avec sa terrasse privée face à l''eau turquoise et aux collines boisées de Nefza.','بنغالو على ركائز عند حافة البحيرة، بشرفة خاصة تطل على المياه الفيروزية وتلال نفزة الخضراء.','{}','{"Petit-déjeuner tunisien","Déjeuner poisson grillé","Tour en barque sur la lagune","Thé aux pignons","Serviettes et linge de lit"}','{"فطور تونسي","غداء سمك مشوي","جولة بالقارب في البحيرة","شاي بالصنوبر","مناشف وأغطية"}',80,150,1),
('sable','Bungalow Sable d''Or','بنغالو الرمل الذهبي',4,'Le plus spacieux de nos bungalows, ouvert sur les hauts-fonds ambrés. Idéal pour une famille ou un petit groupe d''amis.','أوسع بنغالوهاتنا، يطل على المياه الضحلة الذهبية. مثالي للعائلة أو مجموعة صغيرة من الأصدقاء.','{}','{"Petit-déjeuner tunisien","Déjeuner poisson grillé","Tour en barque sur la lagune","Feu de bois en soirée","Serviettes et linge de lit"}','{"فطور تونسي","غداء سمك مشوي","جولة بالقارب في البحيرة","نار خشب مساءً","مناشف وأغطية"}',110,195,2),
('corail','Bungalow Corail','بنغالو المرجان',2,'Toit corail, murs blancs, un ponton pour soi. Le bungalow le plus proche du chenal, parfait pour voir le lever du soleil.','سقف مرجاني، جدران بيضاء، ورصيف خاص. أقرب بنغالو إلى القناة، مثالي لمشاهدة شروق الشمس.','{}','{"Petit-déjeuner tunisien","Déjeuner poisson grillé","Tour en barque sur la lagune","Location de kayak (1h)"}','{"فطور تونسي","غداء سمك مشوي","جولة بالقارب في البحيرة","تأجير كاياك (ساعة)"}',95,170,3),
('colline','Bungalow Colline','بنغالو التلة',6,'Adossé à la rive verte, ce bungalow accueille jusqu''à six personnes avec une longue table sur la terrasse.','يستند إلى الضفة الخضراء، ويتسع لستة أشخاص مع طاولة طويلة على الشرفة.','{}','{"Petit-déjeuner tunisien","Déjeuner poisson grillé pour 6","Tour en barque sur la lagune","Feu de bois en soirée","Serviettes et linge de lit"}','{"فطور تونسي","غداء سمك مشوي لستة","جولة بالقارب في البحيرة","نار خشب مساءً","مناشف وأغطية"}',150,260,4);