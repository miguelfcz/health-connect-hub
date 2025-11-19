-- Enum para roles de usuário
CREATE TYPE user_role AS ENUM ('PACIENTE', 'PROFISSIONAL');

-- Tabela de perfis de usuário
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  role user_role NOT NULL,
  especialidade TEXT,
  crm TEXT,
  telefone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de disponibilidade dos profissionais
CREATE TABLE disponibilidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_profissional FOREIGN KEY (profissional_id) REFERENCES profiles(id)
);

-- Tabela de agendamentos
CREATE TABLE agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data_hora TIMESTAMPTZ NOT NULL,
  duracao_minutos INTEGER DEFAULT 30,
  status TEXT DEFAULT 'AGENDADO' CHECK (status IN ('AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO')),
  motivo TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de mensagens do chat
CREATE TABLE mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID NOT NULL REFERENCES agendamentos(id) ON DELETE CASCADE,
  remetente_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  tipo TEXT DEFAULT 'TEXTO' CHECK (tipo IN ('TEXTO', 'ARQUIVO', 'IMAGEM')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE disponibilidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;

-- RLS Policies para profiles
CREATE POLICY "Usuários podem ver todos os perfis"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem inserir seu próprio perfil"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies para disponibilidade
CREATE POLICY "Todos podem ver disponibilidades"
  ON disponibilidade FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Profissionais podem gerenciar sua disponibilidade"
  ON disponibilidade FOR ALL
  TO authenticated
  USING (auth.uid() = profissional_id)
  WITH CHECK (auth.uid() = profissional_id);

-- RLS Policies para agendamentos
CREATE POLICY "Usuários podem ver seus agendamentos"
  ON agendamentos FOR SELECT
  TO authenticated
  USING (auth.uid() = paciente_id OR auth.uid() = profissional_id);

CREATE POLICY "Pacientes podem criar agendamentos"
  ON agendamentos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = paciente_id);

CREATE POLICY "Usuários podem atualizar seus agendamentos"
  ON agendamentos FOR UPDATE
  TO authenticated
  USING (auth.uid() = paciente_id OR auth.uid() = profissional_id);

-- RLS Policies para mensagens
CREATE POLICY "Usuários podem ver mensagens dos seus agendamentos"
  ON mensagens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agendamentos
      WHERE agendamentos.id = mensagens.agendamento_id
      AND (agendamentos.paciente_id = auth.uid() OR agendamentos.profissional_id = auth.uid())
    )
  );

CREATE POLICY "Usuários podem enviar mensagens nos seus agendamentos"
  ON mensagens FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = remetente_id
    AND EXISTS (
      SELECT 1 FROM agendamentos
      WHERE agendamentos.id = mensagens.agendamento_id
      AND (agendamentos.paciente_id = auth.uid() OR agendamentos.profissional_id = auth.uid())
    )
  );

-- Trigger para criar perfil automaticamente ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome', new.email),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'PACIENTE')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agendamentos_updated_at
  BEFORE UPDATE ON agendamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar realtime para mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE mensagens;