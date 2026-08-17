-- Liarena SaaS: Core Reconstruction Migration
-- Optimized for compatibility with current frontend code.

-- 1. Custom Types
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM (
        'developer',
        'organization_admin',
        'doctor',
        'assistant',
        'nurse',
        'reception'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    business_name TEXT,
    slug TEXT UNIQUE NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    logo TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    correo TEXT,
    username TEXT UNIQUE,
    nombre TEXT,
    apellidos TEXT,
    role public.user_role NOT NULL DEFAULT 'doctor',
    status TEXT DEFAULT 'active',
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    telefono TEXT,
    avatar_url TEXT,
    ultimo_inicio_sesion TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Doctor Profiles (Clinical details)
-- Using user_id instead of id for consistency with service code
CREATE TABLE IF NOT EXISTS public.doctor_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    especialidad TEXT DEFAULT 'Médico General',
    cedula_profesional TEXT,
    cedula_especialidad TEXT,
    firma TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Patients
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    expediente TEXT UNIQUE,
    nombre TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    fecha_nacimiento DATE,
    sexo TEXT,
    curp TEXT,
    telefono TEXT,
    correo TEXT,
    direccion TEXT,
    contacto_emergencia TEXT,
    foto_url TEXT,
    alergias TEXT,
    antecedentes TEXT,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 6. Studies
CREATE TABLE IF NOT EXISTS public.studies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    tipo_estudio TEXT NOT NULL,
    custom_study_name TEXT,
    status TEXT DEFAULT 'scheduled',
    observaciones TEXT,
    fecha_inicio TIMESTAMP WITH TIME ZONE,
    fecha_fin TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 7. Multimedia
CREATE TABLE IF NOT EXISTS public.multimedia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    study_id UUID REFERENCES public.studies(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    is_selected_for_report BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    user_id UUID REFERENCES public.users(id),
    study_id UUID REFERENCES public.studies(id),
    accion TEXT NOT NULL,
    detalles JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. Security & RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multimedia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 10. RLS Helpers
CREATE OR REPLACE FUNCTION public.get_current_org_id()
RETURNS UUID AS $$
    SELECT (auth.jwt() -> 'user_metadata' ->> 'organization_id')::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 11. Policies (Standard SaaS Isolation)
-- Allow anon to lookup correo by username for login flow
CREATE POLICY "user_lookup_anon" ON public.users FOR SELECT TO anon USING (true);
CREATE POLICY "org_iso" ON public.organizations FOR ALL TO authenticated USING (id = public.get_current_org_id());
CREATE POLICY "user_iso" ON public.users FOR ALL TO authenticated USING (organization_id = public.get_current_org_id() OR auth_user_id = auth.uid());
CREATE POLICY "doc_iso" ON public.doctor_profiles FOR ALL TO authenticated USING (organization_id = public.get_current_org_id());
CREATE POLICY "pat_iso" ON public.patients FOR ALL TO authenticated USING (organization_id = public.get_current_org_id());
CREATE POLICY "study_iso" ON public.studies FOR ALL TO authenticated USING (organization_id = public.get_current_org_id());
CREATE POLICY "media_iso" ON public.multimedia FOR ALL TO authenticated USING (organization_id = public.get_current_org_id());
CREATE POLICY "audit_iso" ON public.audit_logs FOR ALL TO authenticated USING (organization_id = public.get_current_org_id());

-- 12. Auto-sync trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    org_id UUID;
    v_role public.user_role;
BEGIN
    org_id := (new.raw_user_meta_data->>'organization_id')::UUID;
    v_role := COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'doctor');

    INSERT INTO public.users (auth_user_id, email, correo, username, nombre, apellidos, role, organization_id)
    VALUES (
        new.id,
        new.email,
        new.email,
        new.raw_user_meta_data->>'username',
        new.raw_user_meta_data->>'nombre',
        new.raw_user_meta_data->>'apellidos',
        v_role,
        org_id
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
