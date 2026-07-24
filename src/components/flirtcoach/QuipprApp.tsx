import { useEffect, useState } from "react";
import { AppErrorFallback } from "@/components/AppErrorFallback";
import { Onboarding } from "@/components/flirtcoach/Onboarding";
import { Home } from "@/components/flirtcoach/Home";
import { Chat } from "@/components/flirtcoach/Chat";
import { Auth } from "@/components/flirtcoach/Auth";
import { Profile } from "@/components/flirtcoach/Profile";
import { History } from "@/components/flirtcoach/History";
import { HistoryChat } from "@/components/flirtcoach/HistoryChat";
import { Stats } from "@/components/flirtcoach/Stats";
import { Paywall } from "@/components/flirtcoach/Paywall";
import { GdprConsent } from "@/components/flirtcoach/GdprConsent";
import { useAuth } from "@/contexts/AuthContext";
import { usePremium } from "@/contexts/PremiumContext";
import { trackConversationLimitReached, trackConversationStarted } from "@/lib/analytics/posthog";
import { hasGdprConsent } from "@/lib/gdpr";
import { FREE_CONVERSATION_LIMIT } from "@/lib/revenuecat/premium";
import { createConversation, getConversationsForUser } from "@/lib/supabase/conversations";
import { isSupabaseConfigured, supabaseConfigError } from "@/lib/supabase/client";
import type { Character, ScenarioId } from "@/lib/flirtcoach/data";

type Screen = "onboarding" | "home" | "chat" | "profile" | "history" | "historyChat" | "stats" | "paywall";

export function QuipprApp() {
  const { user, loading: authLoading } = useAuth();
  const { isPremium } = usePremium();
  const [screen, setScreen] = useState<Screen>("home");
  const [character, setCharacter] = useState<Character | null>(null);
  const [scenario, setScenario] = useState<ScenarioId>("neutral");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyConversationId, setHistoryConversationId] = useState<string | null>(null);
  const [conversationCount, setConversationCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    try {
      setConsentGiven(hasGdprConsent());
      const done = localStorage.getItem("fc_onboarded") === "1";
      setScreen(done ? "home" : "onboarding");
    } catch (e) {
      console.error("Failed to read local app state:", e);
      setConsentGiven(false);
      setScreen("onboarding");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    void getConversationsForUser(user.id)
      .then((rows) => setConversationCount(rows.length))
      .catch((e) => console.error("Failed to load conversation count:", e));
  }, [user?.id, screen]);

  function finishOnboarding() {
    localStorage.setItem("fc_onboarded", "1");
    setScreen("home");
  }

  function openPaywall() {
    setScreen("paywall");
  }

  async function startChat(c: Character, s: ScenarioId) {
    if (!user) return;

    if (!isPremium && conversationCount >= FREE_CONVERSATION_LIMIT) {
      trackConversationLimitReached();
      openPaywall();
      return;
    }

    setStartingChat(true);
    try {
      const id = await createConversation(user.id, c.id, s);
      setCharacter(c);
      setScenario(s);
      setConversationId(id);
      setConversationCount((count) => count + 1);
      trackConversationStarted(c.name, s);
      setScreen("chat");
    } catch (e) {
      console.error("Failed to create conversation:", e);
    } finally {
      setStartingChat(false);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="fc-app-shell mx-auto w-full max-w-[430px]">
        <AppErrorFallback message={supabaseConfigError ?? undefined} />
      </div>
    );
  }

  if (!hydrated || authLoading) {
    return (
      <div className="fc-app-shell mx-auto flex w-full max-w-[430px] flex-col items-center justify-center px-6">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl fc-gradient text-2xl">
          ✨
        </div>
        <p className="text-sm font-medium text-white/70">Loading Quippr…</p>
      </div>
    );
  }

  if (!consentGiven) {
    return (
      <div className="fc-app-shell mx-auto w-full max-w-[430px]">
        <div className="fc-screen-host fc-screen-panel">
          <GdprConsent onAccept={() => setConsentGiven(true)} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fc-app-shell mx-auto w-full max-w-[430px]">
        <div className="fc-screen-host fc-screen-panel">
          <Auth />
        </div>
      </div>
    );
  }

  return (
    <div className="fc-app-shell mx-auto w-full max-w-[430px]">
      <div key={screen} className="fc-screen-host fc-screen-panel fc-fade transition-opacity duration-200">
        {screen === "onboarding" && <Onboarding onDone={finishOnboarding} />}
        {screen === "home" && (
          <Home
            isPremium={isPremium}
            conversationCount={conversationCount}
            conversationLimit={FREE_CONVERSATION_LIMIT}
            onStart={(c, s) => void startChat(c, s)}
            onProfile={() => setScreen("profile")}
            onHistory={() => setScreen("history")}
            onStats={() => setScreen("stats")}
            onPremium={openPaywall}
          />
        )}
        {screen === "profile" && (
          <Profile
            isPremium={isPremium}
            onBack={() => setScreen("home")}
            onPremium={openPaywall}
          />
        )}
        {screen === "history" && (
          <History
            onBack={() => setScreen("home")}
            onOpenConversation={(id) => {
              setHistoryConversationId(id);
              setScreen("historyChat");
            }}
          />
        )}
        {screen === "stats" && <Stats onBack={() => setScreen("home")} />}
        {screen === "paywall" && (
          <Paywall onBack={() => setScreen("home")} onPurchaseSuccess={() => setScreen("home")} />
        )}
        {screen === "historyChat" && historyConversationId && (
          <HistoryChat conversationId={historyConversationId} onBack={() => setScreen("history")} />
        )}
        {screen === "chat" && character && conversationId && (
          <Chat
            character={character}
            scenario={scenario}
            conversationId={conversationId}
            isPremium={isPremium}
            onPremium={openPaywall}
            onBack={() => {
              setConversationId(null);
              setScreen("home");
            }}
          />
        )}
      </div>
      {startingChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="fc-glass rounded-2xl px-6 py-4 text-sm text-white/80">Starting chat…</div>
        </div>
      )}
    </div>
  );
}
