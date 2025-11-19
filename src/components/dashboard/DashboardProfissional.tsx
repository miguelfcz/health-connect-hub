import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, MessageSquare, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Agendamento {
  id: string;
  data_hora: string;
  status: string;
  paciente: {
    nome: string;
  };
}

export default function DashboardProfissional() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgendamentos();
  }, []);

  const fetchAgendamentos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from("agendamentos")
        .select(`
          *,
          paciente:profiles!agendamentos_paciente_id_fkey(nome)
        `)
        .eq("profissional_id", user.id)
        .order("data_hora", { ascending: true });

      if (error) throw error;

      setAgendamentos(data || []);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar agendamentos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Minhas Consultas</h2>
          <p className="text-muted-foreground">Gerencie seus atendimentos</p>
        </div>
        <Button onClick={() => navigate("/disponibilidade")} variant="outline" className="shadow-hover">
          <Settings className="mr-2 h-4 w-4" />
          Configurar Horários
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : agendamentos.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum agendamento</h3>
            <p className="text-muted-foreground mb-4">
              Você ainda não tem consultas agendadas
            </p>
            <Button onClick={() => navigate("/disponibilidade")} variant="outline">
              Configurar horários disponíveis
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {agendamentos.map((agendamento) => (
            <Card key={agendamento.id} className="shadow-soft hover:shadow-hover transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-secondary" />
                  {agendamento.paciente.nome}
                </CardTitle>
                <CardDescription>Consulta agendada</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(agendamento.data_hora), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(agendamento.data_hora), "HH:mm")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    agendamento.status === "AGENDADO" ? "bg-primary/10 text-primary" :
                    agendamento.status === "EM_ANDAMENTO" ? "bg-secondary/10 text-secondary" :
                    agendamento.status === "CONCLUIDO" ? "bg-muted text-muted-foreground" :
                    "bg-destructive/10 text-destructive"
                  }`}>
                    {agendamento.status}
                  </span>
                </div>
                {(agendamento.status === "AGENDADO" || agendamento.status === "EM_ANDAMENTO") && (
                  <Button
                    className="w-full mt-4"
                    variant="outline"
                    onClick={() => navigate(`/consulta/${agendamento.id}`)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Entrar na Consulta
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
