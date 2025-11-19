import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, User, Calendar as CalendarIcon, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, setHours, setMinutes, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Profissional {
  id: string;
  nome: string;
  especialidade: string;
}

export default function Agendar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [selectedProfissional, setSelectedProfissional] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProfissionais();
  }, []);

  const fetchProfissionais = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, especialidade")
        .eq("role", "PROFISSIONAL");

      if (error) throw error;

      setProfissionais(data || []);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar profissionais");
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    return slots;
  };

  const handleAgendar = async () => {
    if (!selectedProfissional || !selectedDate || !selectedTime || !user) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsSubmitting(true);

    try {
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const dataHora = setMinutes(setHours(selectedDate, hours), minutes);

      const { error } = await supabase.from("agendamentos").insert({
        paciente_id: user.id,
        profissional_id: selectedProfissional,
        data_hora: dataHora.toISOString(),
        status: "AGENDADO",
      });

      if (error) throw error;

      toast.success("Consulta agendada com sucesso!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erro ao agendar consulta");
    } finally {
      setIsSubmitting(false);
    }
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Agendar Consulta</h1>
          <p className="text-muted-foreground">Escolha um profissional e um horário</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Escolha o Profissional
              </CardTitle>
              <CardDescription>Selecione quem irá atendê-lo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))
              ) : profissionais.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum profissional disponível
                </p>
              ) : (
                profissionais.map((prof) => (
                  <Button
                    key={prof.id}
                    variant={selectedProfissional === prof.id ? "default" : "outline"}
                    className="w-full justify-start h-auto py-3"
                    onClick={() => setSelectedProfissional(prof.id)}
                  >
                    <div className="text-left">
                      <div className="font-semibold">{prof.nome}</div>
                      <div className="text-xs opacity-80">{prof.especialidade || "Profissional de Saúde"}</div>
                    </div>
                  </Button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Escolha a Data
              </CardTitle>
              <CardDescription>Selecione um dia</CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) =>
                  isBefore(startOfDay(date), startOfDay(new Date())) ||
                  date > addDays(new Date(), 60)
                }
                locale={ptBR}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {selectedDate && (
            <Card className="shadow-soft md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Escolha o Horário
                </CardTitle>
                <CardDescription>
                  Horários disponíveis para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {generateTimeSlots().map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTime(time)}
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {selectedProfissional && selectedDate && selectedTime && (
          <div className="mt-6 flex justify-end">
            <Button
              size="lg"
              onClick={handleAgendar}
              disabled={isSubmitting}
              className="shadow-hover"
            >
              {isSubmitting ? "Agendando..." : "Confirmar Agendamento"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
