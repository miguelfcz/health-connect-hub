import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";

interface Disponibilidade {
  id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  ativo: boolean;
}

const DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export default function Disponibilidade() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [dia, setDia] = useState<string>("1");
  const [horaInicio, setHoraInicio] = useState<string>("08:00");
  const [horaFim, setHoraFim] = useState<string>("17:00");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDisponibilidades();
  }, []);

  const fetchDisponibilidades = async () => {
    try {
      const { data, error } = await supabase
        .from("disponibilidade")
        .select("*")
        .eq("profissional_id", user?.id)
        .eq("ativo", true)
        .order("dia_semana", { ascending: true });

      if (error) throw error;

      setDisponibilidades(data || []);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar disponibilidades");
    } finally {
      setLoading(false);
    }
  };

  const handleAdicionar = async () => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("disponibilidade").insert({
        profissional_id: user.id,
        dia_semana: parseInt(dia),
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        ativo: true,
      });

      if (error) throw error;

      toast.success("Horário adicionado com sucesso!");
      fetchDisponibilidades();
      
      // Reset form
      setDia("1");
      setHoraInicio("08:00");
      setHoraFim("17:00");
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar horário");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemover = async (id: string) => {
    try {
      const { error } = await supabase
        .from("disponibilidade")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;

      toast.success("Horário removido com sucesso!");
      fetchDisponibilidades();
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover horário");
    }
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        options.push(time);
      }
    }
    return options;
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Configurar Disponibilidade</h1>
          <p className="text-muted-foreground">Defina seus horários de atendimento</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Adicionar Horário
              </CardTitle>
              <CardDescription>Configure um novo período de atendimento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Dia da Semana</Label>
                <Select value={dia} onValueChange={setDia}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIAS_SEMANA.map((nome, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hora Início</Label>
                  <Select value={horaInicio} onValueChange={setHoraInicio}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {generateTimeOptions().map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Hora Fim</Label>
                  <Select value={horaFim} onValueChange={setHoraFim}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {generateTimeOptions().map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleAdicionar}
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? "Adicionando..." : "Adicionar Horário"}
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Horários Configurados
              </CardTitle>
              <CardDescription>Seus períodos de atendimento</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : disponibilidades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum horário configurado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {disponibilidades.map((disp) => (
                    <div
                      key={disp.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/5 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{DIAS_SEMANA[disp.dia_semana]}</p>
                        <p className="text-sm text-muted-foreground">
                          {disp.hora_inicio} - {disp.hora_fim}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemover(disp.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
