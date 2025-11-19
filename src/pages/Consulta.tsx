import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, User, Activity } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Mensagem {
  id: string;
  conteudo: string;
  created_at: string;
  remetente: {
    id: string;
    nome: string;
  };
}

interface Agendamento {
  id: string;
  data_hora: string;
  status: string;
  paciente: {
    id: string;
    nome: string;
  };
  profissional: {
    id: string;
    nome: string;
  };
}

export default function Consulta() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [agendamento, setAgendamento] = useState<Agendamento | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !user) return;

    fetchAgendamento();
    fetchMensagens();
    subscribeToMensagens();
  }, [id, user]);

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  const fetchAgendamento = async () => {
    try {
      const { data, error } = await supabase
        .from("agendamentos")
        .select(`
          *,
          paciente:profiles!agendamentos_paciente_id_fkey(id, nome),
          profissional:profiles!agendamentos_profissional_id_fkey(id, nome)
        `)
        .eq("id", id!)
        .single();

      if (error) throw error;

      // Verificar se o usuário tem acesso
      if (data.paciente.id !== user?.id && data.profissional.id !== user?.id) {
        toast.error("Você não tem permissão para acessar esta consulta");
        navigate("/dashboard");
        return;
      }

      setAgendamento(data);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar consulta");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchMensagens = async () => {
    try {
      const { data, error } = await supabase
        .from("mensagens")
        .select(`
          *,
          remetente:profiles!mensagens_remetente_id_fkey(id, nome)
        `)
        .eq("agendamento_id", id!)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMensagens(data || []);
    } catch (error: any) {
      console.error(error);
    }
  };

  const subscribeToMensagens = () => {
    const channel = supabase
      .channel(`mensagens-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensagens",
          filter: `agendamento_id=eq.${id}`,
        },
        async (payload) => {
          const { data: remetente } = await supabase
            .from("profiles")
            .select("id, nome")
            .eq("id", payload.new.remetente_id)
            .single();

          if (remetente) {
            setMensagens((prev) => [
              ...prev,
              {
                ...payload.new,
                remetente,
              } as Mensagem,
            ]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleEnviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!novaMensagem.trim() || !user) return;

    setSending(true);

    try {
      const { error } = await supabase.from("mensagens").insert({
        agendamento_id: id!,
        remetente_id: user.id,
        conteudo: novaMensagem.trim(),
      });

      if (error) throw error;

      setNovaMensagem("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
        <div className="text-center">
          <Activity className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando consulta...</p>
        </div>
      </div>
    );
  }

  if (!agendamento) return null;

  const outraPessoa = agendamento.paciente.id === user?.id 
    ? agendamento.profissional 
    : agendamento.paciente;

  return (
    <div className="min-h-screen bg-gradient-soft flex flex-col">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <div className="text-right">
                <p className="text-sm font-medium">{outraPessoa.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(agendamento.data_hora), "dd/MM/yyyy 'às' HH:mm")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col max-w-4xl">
        <Card className="flex-1 flex flex-col shadow-soft">
          <CardHeader>
            <CardTitle>Sala de Consulta</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
              {mensagens.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhuma mensagem ainda</p>
                  <p className="text-sm">Envie uma mensagem para iniciar a conversa</p>
                </div>
              ) : (
                mensagens.map((mensagem) => {
                  const isOwn = mensagem.remetente.id === user?.id;
                  return (
                    <div
                      key={mensagem.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isOwn
                            ? "bg-gradient-medical text-white"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        <p className="text-xs font-semibold mb-1">
                          {mensagem.remetente.nome}
                        </p>
                        <p className="text-sm">{mensagem.conteudo}</p>
                        <p className={`text-xs mt-1 ${isOwn ? "text-white/70" : "text-muted-foreground"}`}>
                          {format(new Date(mensagem.created_at), "HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleEnviarMensagem} className="flex gap-2">
              <Input
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                placeholder="Digite sua mensagem..."
                disabled={sending}
                className="flex-1"
              />
              <Button type="submit" disabled={sending || !novaMensagem.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
