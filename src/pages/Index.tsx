import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Activity, Calendar, MessageSquare, Shield } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
        <Activity className="h-12 w-12 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <nav className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-medical rounded-xl">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">TeleMed</span>
          </div>
          <Button onClick={() => navigate("/auth")} className="shadow-hover">
            Entrar
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-5xl font-bold text-foreground mb-6 animate-fade-in">
            Saúde conectada, simples assim! 🏥
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Encontre profissionais de saúde rapidinho e marque suas consultas sem complicação. 
            Tudo online, tudo fácil!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")} className="shadow-hover hover-scale">
              Bora começar! 🚀
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="hover-scale">
              Sou da área da saúde
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-6 rounded-xl bg-card shadow-soft hover-scale transition-all">
            <div className="inline-flex p-4 bg-primary/10 rounded-2xl mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Agendamento rápido ⚡</h3>
            <p className="text-muted-foreground">
              Marca uma consulta em minutos, no horário que der pra você!
            </p>
          </div>

          <div className="text-center p-6 rounded-xl bg-card shadow-soft hover-scale transition-all">
            <div className="inline-flex p-4 bg-secondary/10 rounded-2xl mb-4">
              <MessageSquare className="h-8 w-8 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Conversa direto 💬</h3>
            <p className="text-muted-foreground">
              Bate-papo ao vivo com os profissionais, sem sair de casa
            </p>
          </div>

          <div className="text-center p-6 rounded-xl bg-card shadow-soft hover-scale transition-all">
            <div className="inline-flex p-4 bg-accent/10 rounded-2xl mb-4">
              <Shield className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Seus dados seguros 🔒</h3>
            <p className="text-muted-foreground">
              Pode ficar tranquilo, tudo protegido e só seu!
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>&copy; 2024 TeleMed. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
